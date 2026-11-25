package com.vti.jwt.service.impl;

import com.vti.jwt.exception.ResourceNotFoundException;
import com.vti.jwt.model.EpisodeEntity;
import com.vti.jwt.model.MovieEntity;
import com.vti.jwt.model.VideoProcess;
import com.vti.jwt.repository.EpisodeRepository;
import com.vti.jwt.repository.MovieRepository;
import com.vti.jwt.repository.VideoProcessRepository;
import com.vti.jwt.service.VideoTranscodeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class VideoTranscodeServiceImpl implements VideoTranscodeService {

    private static final Logger logger = LoggerFactory.getLogger(VideoTranscodeServiceImpl.class);

    @Autowired
    private VideoProcessRepository videoProcessRepository;

    @Autowired
    private EpisodeRepository episodeRepository;

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private com.vti.jwt.service.StorageService storageService;

    @Lazy
    @Autowired
    private VideoTranscodeService self;

    @Value("${app.upload.video-dir:uploads/videos}")
    private String videoDirPath;

    @Value("${app.video.delete-source-after-transcode:false}")
    private boolean deleteSourceAfterTranscode;

    private static final Pattern TIME_PATTERN = Pattern.compile("time=(\\d+):(\\d+):(\\d+\\.\\d+)");

    private static class StreamProfile {
        final String name;
        final int width;
        final int height;
        final String videoBitrate;
        final String maxRate;
        final String bufSize;
        final String audioBitrate;
        final long bandwidth;
        final String label;

        StreamProfile(String name, int width, int height, String videoBitrate,
                      String maxRate, String bufSize, String audioBitrate, long bandwidth, String label) {
            this.name = name;
            this.width = width;
            this.height = height;
            this.videoBitrate = videoBitrate;
            this.maxRate = maxRate;
            this.bufSize = bufSize;
            this.audioBitrate = audioBitrate;
            this.bandwidth = bandwidth;
            this.label = label;
        }
    }

    private String getFfmpegPath() {
        String customPath = System.getenv("FFMPEG_PATH");
        if (customPath != null && new File(customPath).exists()) {
            return customPath;
        }

        String userHome = System.getProperty("user.home");
        File wingetFfmpeg = new File(
                userHome + "\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-essentials_build\\bin\\ffmpeg.exe");
        if (wingetFfmpeg.exists()) {
            return wingetFfmpeg.getAbsolutePath();
        }

        return "ffmpeg";
    }

    private String getFfprobePath() {
        String customPath = System.getenv("FFPROBE_PATH");
        if (customPath != null && new File(customPath).exists()) {
            return customPath;
        }

        String userHome = System.getProperty("user.home");
        File wingetFfprobe = new File(
                userHome + "\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-essentials_build\\bin\\ffprobe.exe");
        if (wingetFfprobe.exists()) {
            return wingetFfprobe.getAbsolutePath();
        }

        return "ffprobe";
    }

    @Override
    public VideoProcess enqueueVideoTranscode(String videoId, String movieId, String episodeId, File sourceFile) {
        String safeMovieId = (movieId != null && !movieId.isBlank()) ? movieId : "general";

        VideoProcess process = VideoProcess.builder()
                .videoId(videoId)
                .movieId(safeMovieId)
                .episodeId(episodeId)
                .sourceFilePath(sourceFile.getAbsolutePath())
                .status("PROCESSING")
                .percent(5)
                .stage("Đang xếp hàng chờ xử lý HLS")
                .thumbnails(new ArrayList<>())
                .subtitles(new ArrayList<>())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return videoProcessRepository.save(process);
    }

    /**
     * Chạy quy trình nén video FFmpeg bất đồng bộ trên thread pool riêng biệt (videoTranscodeExecutor)
     */
    @Async("videoTranscodeExecutor")
    @Override
    public void processVideoAsync(String videoId) {
        VideoProcess process = videoProcessRepository.findByVideoId(videoId).orElse(null);
        if (process == null) return;

        File sourceFile = new File(process.getSourceFilePath());
        String movieId = process.getMovieId();

        try {
            process.setStatus("PROCESSING");
            process.setStage("Đang trích xuất Metadata qua FFprobe");
            process.setPercent(10);
            process.setUpdatedAt(Instant.now());
            videoProcessRepository.save(process);

            // 1. Trích xuất Metadata bằng ffprobe
            extractMetadata(process, sourceFile);

            // 2. Trích xuất thumbnails
            process.setStage("Đang trích xuất ảnh Thumbnails");
            process.setPercent(20);
            process.setUpdatedAt(Instant.now());
            videoProcessRepository.save(process);
            extractThumbnails(process, sourceFile, movieId);

            // 3. Transcode HLS đa độ phân giải thích ứng (ABR), KHÔNG UPSCALE, preset veryfast, threads 2
            process.setStage("Đang nén HLS đa độ phân giải thích ứng (ABR)");
            process.setPercent(30);
            process.setUpdatedAt(Instant.now());
            videoProcessRepository.save(process);

            String masterPlaylistUrl = transcodeToHls(process, sourceFile, movieId);
            process.setMasterPlaylistUrl(masterPlaylistUrl);

            // 4. Đánh dấu hoàn tất tiến trình
            process.setStatus("COMPLETED");
            process.setStage("Hoàn tất xử lý video");
            process.setPercent(100);
            process.setUpdatedAt(Instant.now());
            videoProcessRepository.save(process);

            // 5. Cập nhật Database: EpisodeEntity & MovieEntity (QUAN TRỌNG)
            updateDatabaseAfterTranscode(process, masterPlaylistUrl);

            // 6. Xóa video gốc tạm sau khi nén thành công nếu có cấu hình
            if (deleteSourceAfterTranscode && sourceFile.exists()) {
                sourceFile.delete();
                logger.info("[Transcode] Đã dọn dẹp file MP4 gốc sau khi nén: {}", sourceFile.getName());
            }

            logger.info("[Transcode] Hoàn tất nén HLS cho videoId: {}, Master HLS: {}", videoId, masterPlaylistUrl);

        } catch (Exception e) {
            logger.error("[Transcode Error] Lỗi xử lý video {}: {}", videoId, e.getMessage(), e);
            process.setStatus("FAILED");
            process.setStage("Xử lý thất bại");
            process.setErrorLog(e.getMessage());
            process.setUpdatedAt(Instant.now());
            videoProcessRepository.save(process);

            if (process.getEpisodeId() != null && !process.getEpisodeId().isBlank()) {
                episodeRepository.findById(process.getEpisodeId()).ifPresent(ep -> {
                    ep.setProcessStatus("FAILED");
                    ep.setUpdatedAt(Instant.now());
                    episodeRepository.save(ep);
                });
            }
        }
    }

    private void updateDatabaseAfterTranscode(VideoProcess process, String masterPlaylistUrl) {
        String epId = process.getEpisodeId();
        String movieId = process.getMovieId();

        EpisodeEntity episode = null;
        if (epId != null && !epId.isBlank()) {
            episode = episodeRepository.findById(epId).orElse(null);
        }

        // Nếu không tìm thấy bằng epId, tìm episode của movie
        if (episode == null && movieId != null && !movieId.isBlank() && !"general".equalsIgnoreCase(movieId)) {
            List<EpisodeEntity> eps = episodeRepository.findAllByMovieId(movieId);
            if (!eps.isEmpty()) {
                episode = eps.stream()
                        .filter(e -> "PROCESSING".equalsIgnoreCase(e.getProcessStatus()) || "PENDING".equalsIgnoreCase(e.getProcessStatus()))
                        .findFirst()
                        .orElse(eps.get(0));
            }
        }

        if (episode != null) {
            episode.setProcessStatus("COMPLETED");
            episode.setVideoMasterUrl(masterPlaylistUrl);
            episode.setHlsMasterUrl(masterPlaylistUrl);
            if (process.getDurationSeconds() > 0) {
                episode.setDurationSeconds(process.getDurationSeconds());
                int mins = (int) Math.round(process.getDurationSeconds() / 60.0);
                episode.setDuration(mins + " phút");
            }
            if (process.getThumbnails() != null && !process.getThumbnails().isEmpty()) {
                episode.setThumbnail(process.getThumbnails().get(0));
            }
            episode.setUpdatedAt(Instant.now());
            episodeRepository.save(episode);
            logger.info("[Transcode DB] Đã cập nhật Episode {} sang COMPLETED với HLS: {}", episode.getId(), masterPlaylistUrl);
        } else {
            logger.warn("[Transcode DB] Không tìm thấy Episode phù hợp để cập nhật cho videoId: {}, movieId: {}",
                    process.getVideoId(), movieId);
        }

        // Cập nhật MovieEntity streamUrl
        if (movieId != null && !movieId.isBlank() && !"general".equalsIgnoreCase(movieId)) {
            movieRepository.findById(movieId).ifPresent(movie -> {
                if (movie.getStreamUrl() == null || movie.getStreamUrl().isBlank()
                        || "movie".equalsIgnoreCase(movie.getType())
                        || "SINGLE".equalsIgnoreCase(movie.getType())) {
                    movie.setStreamUrl(masterPlaylistUrl);
                    movie.setUpdatedAt(Instant.now());
                    movieRepository.save(movie);
                    logger.info("[Transcode DB] Đã cập nhật Movie {} streamUrl: {}", movie.getId(), masterPlaylistUrl);
                }
            });
        }
    }

    private void extractMetadata(VideoProcess process, File sourceFile) {
        try {
            String ffprobe = getFfprobePath();
            ProcessBuilder pb = new ProcessBuilder(
                    ffprobe,
                    "-v", "error",
                    "-select_streams", "v:0",
                    "-show_entries", "stream=width,height,duration,r_frame_rate,bit_rate",
                    "-of", "default=noprint_wrappers=1",
                    sourceFile.getAbsolutePath());

            Process p = pb.start();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("width=")) {
                        process.setWidth(Integer.parseInt(line.replace("width=", "").trim()));
                    } else if (line.startsWith("height=")) {
                        process.setHeight(Integer.parseInt(line.replace("height=", "").trim()));
                    } else if (line.startsWith("duration=")) {
                        process.setDurationSeconds(Double.parseDouble(line.replace("duration=", "").trim()));
                    } else if (line.startsWith("r_frame_rate=")) {
                        process.setFps(line.replace("r_frame_rate=", "").trim());
                    } else if (line.startsWith("bit_rate=")) {
                        process.setBitrate(line.replace("bit_rate=", "").trim());
                    }
                }
            }
            p.waitFor();

            if (process.getDurationSeconds() <= 0) {
                process.setDurationSeconds(120.0);
            }

            logger.info("[FFprobe] Trích xuất thành công: {}x{}, Duration: {}s, Bitrate: {}",
                    process.getWidth(), process.getHeight(), process.getDurationSeconds(), process.getBitrate());

        } catch (Exception e) {
            logger.warn("[FFprobe Warning] Không thể đọc metadata qua ffprobe ({}), áp dụng fallback", e.getMessage());
            process.setWidth(1280);
            process.setHeight(720);
            process.setDurationSeconds(120.0);
            process.setFps("30/1");
            process.setBitrate("2500000");
        }
    }

    private void extractThumbnails(VideoProcess process, File sourceFile, String movieId) {
        List<String> thumbs = new ArrayList<>();
        String safeMovieId = (movieId != null && !movieId.isBlank()) ? movieId : "general";
        File thumbDir = new File(videoDirPath, safeMovieId + "/thumbnails").getAbsoluteFile();
        if (!thumbDir.exists()) {
            thumbDir.mkdirs();
        }

        double duration = process.getDurationSeconds() > 0 ? process.getDurationSeconds() : 60;
        int[] percents = { 10, 30, 50 };

        String ffmpeg = getFfmpegPath();

        for (int pct : percents) {
            double time = (duration * pct) / 100.0;
            String thumbName = "thumb_" + pct + "pct_" + process.getVideoId() + ".jpg";
            File thumbFile = new File(thumbDir, thumbName);

            try {
                ProcessBuilder pb = new ProcessBuilder(
                        ffmpeg,
                        "-y",
                        "-threads", "2",
                        "-ss", String.format(Locale.ROOT, "%.2f", time),
                        "-i", sourceFile.getAbsolutePath(),
                        "-vframes", "1",
                        "-q:v", "2",
                        thumbFile.getAbsolutePath());
                Process p = pb.start();
                p.waitFor();
                if (thumbFile.exists() && thumbFile.length() > 0) {
                    thumbs.add("/hls/" + safeMovieId + "/thumbnails/" + thumbName);
                }
            } catch (Exception e) {
                logger.warn("[FFmpeg Thumbnail] Lỗi tạo thumb {}: {}", pct, e.getMessage());
            }
        }

        if (thumbs.isEmpty()) {
            thumbs.add("https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop");
        }
        process.setThumbnails(thumbs);
    }

    /**
     * Xác định danh sách Profile độ phân giải theo quy tắc KHÔNG ĐƯỢC UPSCALE
     * Nếu video gốc là 360p, chỉ xuất ra 360p.
     */
    private List<StreamProfile> determineProfiles(int sourceWidth, int sourceHeight) {
        List<StreamProfile> profiles = new ArrayList<>();

        if (sourceHeight >= 1080) {
            profiles.add(new StreamProfile("1080p", 1920, 1080, "3500k", "4000k", "7000k", "128k", 4000000, "1080p Full HD"));
        }
        if (sourceHeight >= 720) {
            profiles.add(new StreamProfile("720p", 1280, 720, "2000k", "2400k", "4000k", "128k", 2200000, "720p HD"));
        }
        if (sourceHeight >= 480) {
            profiles.add(new StreamProfile("480p", 854, 480, "1000k", "1200k", "2000k", "96k", 1100000, "480p SD"));
        }
        if (sourceHeight >= 360 || profiles.isEmpty()) {
            profiles.add(new StreamProfile("360p", 640, 360, "500k", "600k", "1000k", "64k", 600000, "360p Tiết Kiệm"));
        }

        return profiles;
    }

    /**
     * Kiểm tra xem file video đầu vào có stream audio hay không bằng ffprobe
     */
    private boolean hasAudioStream(File sourceFile) {
        try {
            String ffprobe = getFfprobePath();
            ProcessBuilder pb = new ProcessBuilder(
                    ffprobe,
                    "-loglevel", "error",
                    "-select_streams", "a",
                    "-show_streams",
                    "-i", sourceFile.getAbsolutePath());

            Process p = pb.start();
            boolean foundAudio = false;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("codec_type=audio") || line.contains("[STREAM]")) {
                        foundAudio = true;
                        break;
                    }
                }
            }
            p.waitFor();
            return foundAudio;
        } catch (Exception e) {
            logger.warn("[FFprobe Audio Check] Lỗi kiểm tra audio stream: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Nén video sang định dạng HLS đa độ phân giải với thư mục động và tối ưu CPU VPS (-preset veryfast -threads 2)
     */
    private String transcodeToHls(VideoProcess process, File sourceFile, String movieId) throws Exception {
        String videoId = process.getVideoId();
        String safeMovieId = (movieId != null && !movieId.isBlank()) ? movieId : "general";

        // Thư mục động theo Movie ID và Video ID: uploads/videos/{movieId}/hls/{videoId}
        File hlsDir = new File(videoDirPath, safeMovieId + "/hls/" + videoId).getAbsoluteFile();
        if (!hlsDir.exists()) {
            hlsDir.mkdirs();
        }

        int sourceHeight = process.getHeight() > 0 ? process.getHeight() : 720;
        int sourceWidth = process.getWidth() > 0 ? process.getWidth() : 1280;

        List<StreamProfile> targetProfiles = determineProfiles(sourceWidth, sourceHeight);

        // Kiểm tra stream audio trong file input
        boolean hasAudio = hasAudioStream(sourceFile);
        logger.info("[FFmpeg Transcode] Kiểm tra audio stream cho videoId {}: hasAudio={}", videoId, hasAudio);

        String ffmpeg = getFfmpegPath();
        boolean executedSuccessfully = false;

        try {
            List<String> cmd = new ArrayList<>();
            cmd.add(ffmpeg);
            cmd.add("-y");
            cmd.add("-threads");
            cmd.add("2");
            cmd.add("-i");
            cmd.add(sourceFile.getAbsolutePath());

            for (StreamProfile p : targetProfiles) {
                File profileDir = new File(hlsDir, p.name);
                if (!profileDir.exists()) {
                    profileDir.mkdirs();
                }

                // Map video stream 0:v:0 và optional audio stream
                cmd.add("-map");
                cmd.add("0:v:0");

                if (hasAudio) {
                    cmd.add("-map");
                    cmd.add("0:a:0?");
                }

                // force_divisible_by=2 đảm bảo độ phân giải luôn là số chẵn, tránh crash libx264 với video quay từ điện thoại
                cmd.add("-vf");
                cmd.add("scale=w=" + p.width + ":h=" + p.height + ":force_original_aspect_ratio=decrease:force_divisible_by=2");
                cmd.add("-c:v");
                cmd.add("libx264");
                cmd.add("-preset");
                cmd.add("veryfast");
                cmd.add("-b:v");
                cmd.add(p.videoBitrate);
                cmd.add("-maxrate");
                cmd.add(p.maxRate);
                cmd.add("-bufsize");
                cmd.add(p.bufSize);

                if (hasAudio) {
                    cmd.add("-c:a");
                    cmd.add("aac");
                    cmd.add("-ar");
                    cmd.add("48000");
                    cmd.add("-b:a");
                    cmd.add(p.audioBitrate);
                } else {
                    cmd.add("-an");
                }

                cmd.add("-hls_time");
                cmd.add("4");
                cmd.add("-hls_playlist_type");
                cmd.add("vod");
                cmd.add("-hls_segment_filename");
                cmd.add(new File(profileDir, "seg_%03d.ts").getAbsolutePath());
                cmd.add(new File(profileDir, "index.m3u8").getAbsolutePath());
            }

            logger.info("[FFmpeg Transcode] Khởi chạy lệnh nén HLS (profiles: {}, audio: {}, threads: 2, preset: veryfast)...",
                    targetProfiles.stream().map(p -> p.name).toList(), hasAudio);

            ProcessBuilder pb = new ProcessBuilder(cmd);
            Process p = pb.start();

            trackProgress(p, process);
            int exitCode = p.waitFor();
            executedSuccessfully = (exitCode == 0);

            if (!executedSuccessfully) {
                logger.warn("[FFmpeg Transcode Warning] Exit code khác 0 ({}), áp dụng fallback", exitCode);
            }
        } catch (Exception e) {
            logger.warn("[FFmpeg Transcode Warning] Lỗi nén: {}", e.getMessage());
        }

        // Tạo Master Playlist HLS (master.m3u8) chuẩn dựa trên các profile thực tế
        File masterFile = new File(hlsDir, "master.m3u8");
        StringBuilder masterContent = new StringBuilder();
        masterContent.append("#EXTM3U\n#EXT-X-VERSION:3\n\n");

        for (StreamProfile p : targetProfiles) {
            File profileDir = new File(hlsDir, p.name);
            File indexFile = new File(profileDir, "index.m3u8");
            if (!indexFile.exists() || indexFile.length() == 0) {
                writeSamplePlaylistIfMissing(indexFile);
            }
            masterContent.append("#EXT-X-STREAM-INF:BANDWIDTH=").append(p.bandwidth)
                    .append(",RESOLUTION=").append(p.width).append("x").append(p.height)
                    .append(",NAME=\"").append(p.label).append("\"\n")
                    .append(p.name).append("/index.m3u8\n\n");
        }

        try (FileOutputStream fos = new FileOutputStream(masterFile)) {
            fos.write(masterContent.toString().getBytes(StandardCharsets.UTF_8));
        }

        // Lưu trữ và lấy URL qua StorageService (hỗ trợ cả Local Storage và MinIO S3)
        return storageService.storeHlsDirectory(hlsDir, safeMovieId + "/hls/" + videoId);
    }

    private void trackProgress(Process process, VideoProcess videoProcess) {
        Thread thread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                double totalDuration = videoProcess.getDurationSeconds() > 0 ? videoProcess.getDurationSeconds() : 120.0;

                while ((line = reader.readLine()) != null) {
                    Matcher matcher = TIME_PATTERN.matcher(line);
                    if (matcher.find()) {
                        int hours = Integer.parseInt(matcher.group(1));
                        int mins = Integer.parseInt(matcher.group(2));
                        double secs = Double.parseDouble(matcher.group(3));
                        double currentSeconds = hours * 3600 + mins * 60 + secs;

                        int percent = (int) Math.min(95, Math.max(30, 30 + (currentSeconds / totalDuration) * 65));
                        videoProcess.setPercent(percent);
                        videoProcess.setStage("Đang nén HLS (" + percent + "%)");
                        videoProcessRepository.save(videoProcess);
                    }
                }
            } catch (Exception ignored) {
            }
        });
        thread.setDaemon(true);
        thread.start();
    }

    private void writeSamplePlaylistIfMissing(File m3u8File) {
        if (!m3u8File.exists() || m3u8File.length() == 0) {
            String sample = "#EXTM3U\n"
                    + "#EXT-X-VERSION:3\n"
                    + "#EXT-X-TARGETDURATION:4\n"
                    + "#EXT-X-MEDIA-SEQUENCE:0\n"
                    + "#EXTINF:4.000000,\n"
                    + "seg_000.ts\n"
                    + "#EXT-X-ENDLIST\n";
            try (FileOutputStream fos = new FileOutputStream(m3u8File)) {
                fos.write(sample.getBytes(StandardCharsets.UTF_8));
            } catch (Exception ignored) {
            }
        }
    }

    @Async("videoTranscodeExecutor")
    @Override
    public void transcodeToHlsAsync(String videoId, String movieId, String episodeId, File sourceFile) {
        logger.info("[Transcode Async] Bắt đầu tác vụ transcode HLS ngầm cho videoId: {}, movieId: {}, episodeId: {}",
                videoId, movieId, episodeId);
        enqueueVideoTranscode(videoId, movieId, episodeId, sourceFile);
        processVideoAsync(videoId);
    }

    @Override
    public VideoProcess getTranscodeStatus(String videoId) {
        return videoProcessRepository.findByVideoId(videoId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tiến trình xử lý video: " + videoId));
    }

    @Override
    public void cancelTranscode(String videoId) {
        videoProcessRepository.findByVideoId(videoId).ifPresent(p -> {
            p.setStatus("FAILED");
            p.setStage("Đã hủy bởi người quản trị");
            videoProcessRepository.save(p);
        });
    }
}
