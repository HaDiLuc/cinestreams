package com.vti.jwt.controller;

import com.vti.jwt.dto.request.MergeChunksRequest;
import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.exception.ResourceNotFoundException;
import com.vti.jwt.model.EpisodeEntity;
import com.vti.jwt.model.MovieEntity;
import com.vti.jwt.model.UploadSession;
import com.vti.jwt.model.VideoProcess;
import com.vti.jwt.repository.EpisodeRepository;
import com.vti.jwt.repository.MovieRepository;
import com.vti.jwt.repository.UploadSessionRepository;
import com.vti.jwt.service.VideoTranscodeService;
import com.vti.jwt.service.VideoUploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/admin/videos")
public class VideoUploadController {

    private static final Logger logger = LoggerFactory.getLogger(VideoUploadController.class);

    @Autowired
    private VideoUploadService videoUploadService;

    @Autowired
    private VideoTranscodeService videoTranscodeService;

    @Autowired
    private UploadSessionRepository uploadSessionRepository;

    @Autowired
    private EpisodeRepository episodeRepository;

    @Autowired
    private MovieRepository movieRepository;

    /**
     * TASK-019: API Khởi tạo phiên Upload video (Init Upload Session)
     */
    @PostMapping("/upload/init")
    public ResponseEntity<ResponseModel<Map<String, Object>>> initUpload(
            @RequestParam String fileName,
            @RequestParam long fileSize,
            @RequestParam int totalChunks,
            @RequestParam(required = false, defaultValue = "5242880") long chunkSize,
            @RequestParam(required = false, defaultValue = "general") String movieId,
            @RequestParam(required = false) String episodeId) {

        UploadSession session = videoUploadService.initUpload(
                fileName, fileSize, totalChunks, chunkSize, movieId, episodeId);

        Map<String, Object> data = new HashMap<>();
        data.put("uploadId", session.getUploadId());
        data.put("fileName", session.getFileName());
        data.put("totalChunks", session.getTotalChunks());
        data.put("chunkSize", session.getChunkSize());
        data.put("movieId", session.getMovieId());
        data.put("episodeId", session.getEpisodeId());

        return ResponseEntity.ok(ResponseModel.success(data, "Khởi tạo phiên upload video thành công!"));
    }

    /**
     * Endpoint nhận từng Chunk video
     * Path: POST /api/admin/videos/upload-chunk
     */
    @PostMapping(value = "/upload-chunk", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> uploadChunkNew(
            @RequestParam("file") MultipartFile file,
            @RequestParam("uploadId") String uploadId,
            @RequestParam("chunkIndex") int chunkIndex,
            @RequestParam(value = "totalChunks", required = false, defaultValue = "1") int totalChunks) {

        if (file == null || file.isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "File chunk không được để trống!");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            videoUploadService.saveChunk(uploadId, chunkIndex, totalChunks, file);

            Map<String, Object> data = new HashMap<>();
            data.put("success", true);
            data.put("chunkIndex", chunkIndex);
            data.put("uploadId", uploadId);
            data.put("message", "Upload chunk " + chunkIndex + " thành công!");

            return ResponseEntity.ok(data);
        } catch (IOException e) {
            logger.error("[Upload Chunk Error] Lỗi lưu chunk {} cho uploadId {}: {}", chunkIndex, uploadId, e.getMessage());
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Lỗi lưu chunk: " + e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /**
     * Endpoint Ghép File (Merge) & Kích hoạt Transcode HLS ngầm
     * Path: POST /api/admin/videos/merge-chunks
     * Payload JSON: { uploadId, fileName, totalChunks, movieId, episodeNumber, episodeId }
     */
    @PostMapping(value = "/merge-chunks", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> mergeChunks(@RequestBody MergeChunksRequest request) {
        String uploadId = request.getUploadId();
        String safeMovieId = (request.getMovieId() != null && !request.getMovieId().isBlank())
                ? request.getMovieId() : "general";
        int totalChunks = request.getTotalChunks();
        String fileName = request.getFileName();
        Integer episodeNumber = request.getEpisodeNumber();
        String episodeId = request.getEpisodeId();

        if (uploadId == null || uploadId.isBlank() || totalChunks <= 0) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Thông tin uploadId và totalChunks không hợp lệ!");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            // 1. Tìm hoặc khởi tạo EpisodeEntity tương ứng trong DB
            EpisodeEntity targetEpisode = null;
            if (episodeId != null && !episodeId.isBlank()) {
                targetEpisode = episodeRepository.findById(episodeId).orElse(null);
            }

            if (targetEpisode == null && !"general".equals(safeMovieId) && episodeNumber != null) {
                List<EpisodeEntity> eps = episodeRepository.findAllByMovieId(safeMovieId);
                targetEpisode = eps.stream()
                        .filter(e -> Objects.equals(e.getEpisodeNumber(), episodeNumber))
                        .findFirst()
                        .orElse(null);
            }

            if (targetEpisode == null && !"general".equals(safeMovieId)) {
                int epNum = (episodeNumber != null && episodeNumber > 0) ? episodeNumber : 1;
                MovieEntity movie = movieRepository.findById(safeMovieId).orElse(null);
                String epTitle = (movie != null && movie.getTitle() != null)
                        ? (movie.getTitle() + " - Tập " + epNum)
                        : ("Tập " + epNum);

                targetEpisode = EpisodeEntity.builder()
                        .movieId(safeMovieId)
                        .seasonNumber(1)
                        .episodeNumber(epNum)
                        .title(epTitle)
                        .duration("Đang xử lý")
                        .processStatus("PROCESSING")
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
                targetEpisode = episodeRepository.save(targetEpisode);
                logger.info("[Merge Chunks] Đã tạo mới Episode: {} cho movieId: {}", targetEpisode.getId(), safeMovieId);
            } else if (targetEpisode != null) {
                targetEpisode.setProcessStatus("PROCESSING");
                targetEpisode.setUpdatedAt(Instant.now());
                episodeRepository.save(targetEpisode);
                logger.info("[Merge Chunks] Cập nhật Episode: {} sang PROCESSING", targetEpisode.getId());
            }

            // 2. Ghép tuần tự các chunk bằng FileOutputStream + BufferedOutputStream
            File mergedFile = videoUploadService.mergeChunksStream(uploadId, fileName, totalChunks, safeMovieId);

            // 3. Kích hoạt xử lý FFmpeg transcode HLS bất đồng bộ (@Async)
            String videoId = "vid_" + uploadId.substring(0, Math.min(8, uploadId.length()));
            String targetEpId = (targetEpisode != null) ? targetEpisode.getId() : "";
            videoTranscodeService.transcodeToHlsAsync(videoId, safeMovieId, targetEpId, mergedFile);

            Map<String, Object> data = new HashMap<>();
            data.put("success", true);
            data.put("uploadId", uploadId);
            data.put("videoId", videoId);
            data.put("movieId", safeMovieId);
            data.put("episodeId", targetEpId);
            data.put("status", "PROCESSING");
            data.put("fileName", mergedFile.getName());
            data.put("fileSize", mergedFile.length());
            data.put("message", "Ghép file thành công! Đã chuyển sang luồng nén HLS FFmpeg ngầm.");

            return ResponseEntity.ok(data);

        } catch (IOException e) {
            logger.error("[Merge Chunks Error] Lỗi ghép file cho uploadId {}: {}", uploadId, e.getMessage(), e);
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Lỗi ghép chunk: " + e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /**
     * TASK-020: API Nhận từng phần video (Upload Chunk API)
     */
    @PostMapping(value = "/upload/chunk", consumes = "multipart/form-data")
    public ResponseEntity<ResponseModel<Map<String, Object>>> uploadChunk(
            @RequestParam("uploadId") String uploadId,
            @RequestParam("chunkIndex") int chunkIndex,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "chunk", required = false) MultipartFile chunk) {

        MultipartFile actualFile = file != null ? file : chunk;
        if (actualFile == null || actualFile.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("File chunk không được để trống!"));
        }

        try {
            videoUploadService.saveChunk(uploadId, chunkIndex, actualFile);

            Map<String, Object> data = new HashMap<>();
            data.put("uploadId", uploadId);
            data.put("chunkIndex", chunkIndex);
            data.put("receivedSize", actualFile.getSize());

            return ResponseEntity.ok(ResponseModel.success(data, "Upload chunk " + chunkIndex + " thành công!"));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Lỗi lưu chunk: " + e.getMessage()));
        }
    }

    /**
     * TASK-021: API Kiểm tra các chunk đã upload (Resume Check API)
     */
    @GetMapping("/upload/status/{uploadId}")
    public ResponseEntity<ResponseModel<Map<String, Object>>> checkUploadStatus(@PathVariable String uploadId) {
        Set<Integer> chunks = videoUploadService.getUploadedChunks(uploadId);

        Map<String, Object> data = new HashMap<>();
        data.put("uploadId", uploadId);
        data.put("uploadedChunks", chunks);
        data.put("uploadedCount", chunks.size());

        return ResponseEntity.ok(ResponseModel.success(data, "Kiểm tra tiến độ upload thành công!"));
    }

    /**
     * TASK-022 & TASK-023: API Hoàn tất ghép file video (Complete Upload API)
     * - Cập nhật ngay trạng thái Episode sang PROCESSING trong DB
     * - Kích hoạt tiến trình nén FFmpeg ngầm bất đồng bộ (@Async)
     * - Trả về ngay lập tức 200 OK cho Frontend
     */
    @PostMapping("/upload/complete")
    public ResponseEntity<ResponseModel<Map<String, Object>>> completeUpload(
            @RequestParam String uploadId,
            @RequestParam(required = false) String episodeId) {

        try {
            UploadSession session = uploadSessionRepository.findByUploadId(uploadId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên upload với ID: " + uploadId));

            String movieId = (session.getMovieId() != null && !session.getMovieId().isBlank())
                    ? session.getMovieId() : "general";
            String targetEpisodeId = (episodeId != null && !episodeId.isBlank())
                    ? episodeId : session.getEpisodeId();

            // Nếu chưa có episodeId, tự động tìm tập phim hoặc tạo mới Tập 1 để phục vụ phê duyệt
            if ((targetEpisodeId == null || targetEpisodeId.isBlank()) && !"general".equals(movieId)) {
                List<EpisodeEntity> eps = episodeRepository.findAllByMovieId(movieId);
                if (!eps.isEmpty()) {
                    EpisodeEntity ep = eps.stream()
                            .filter(e -> "PENDING".equalsIgnoreCase(e.getProcessStatus()) || "PROCESSING".equalsIgnoreCase(e.getProcessStatus()))
                            .findFirst()
                            .orElse(eps.get(0));
                    targetEpisodeId = ep.getId();
                } else {
                    MovieEntity movie = movieRepository.findById(movieId).orElse(null);
                    String epTitle = (movie != null && movie.getTitle() != null) ? movie.getTitle() : "Tập 1";
                    EpisodeEntity newEp = EpisodeEntity.builder()
                            .movieId(movieId)
                            .seasonNumber(1)
                            .episodeNumber(1)
                            .title(epTitle)
                            .duration("Đang xử lý")
                            .processStatus("PROCESSING")
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    newEp = episodeRepository.save(newEp);
                    targetEpisodeId = newEp.getId();
                    logger.info("[Complete Upload] Tự động tạo Episode 1 cho movieId: {} với ID: {}", movieId, targetEpisodeId);
                }
            }

            // Ghép chunks thành file mp4 hoàn chỉnh
            File mergedFile = videoUploadService.mergeChunks(uploadId);

            // Cập nhật ngay trạng thái Episode sang PROCESSING trong DB
            if (targetEpisodeId != null && !targetEpisodeId.isBlank()) {
                final String finalEpId = targetEpisodeId;
                episodeRepository.findById(finalEpId).ifPresent(ep -> {
                    ep.setProcessStatus("PROCESSING");
                    ep.setUpdatedAt(Instant.now());
                    episodeRepository.save(ep);
                    logger.info("[Complete Upload] Đã set Episode {} sang PROCESSING trong DB", finalEpId);
                });
            }

            // Đưa vào hàng đợi và kích hoạt nén HLS FFmpeg bất đồng bộ ngầm
            String videoId = "vid_" + uploadId.substring(0, Math.min(8, uploadId.length()));
            VideoProcess process = videoTranscodeService.enqueueVideoTranscode(
                    videoId, movieId, targetEpisodeId, mergedFile);

            // Kích hoạt xử lý FFmpeg bất đồng bộ ngầm trên background thread pool
            videoTranscodeService.processVideoAsync(videoId);

            Map<String, Object> data = new HashMap<>();
            data.put("uploadId", uploadId);
            data.put("videoId", videoId);
            data.put("movieId", movieId);
            data.put("episodeId", targetEpisodeId);
            data.put("status", "PROCESSING");
            data.put("mergedFilePath", mergedFile.getName());
            data.put("fileSize", mergedFile.length());
            data.put("message", "Video đã ghép thành công và đang được nén HLS ngầm.");

            return ResponseEntity.ok(ResponseModel.success(data, "Hoàn tất ghép video & đã kích hoạt xử lý HLS ngầm!"));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Lỗi ghép chunk: " + e.getMessage()));
        }
    }

    /**
     * TASK-041: API Lấy trạng thái xử lý video cho Dashboard Admin
     */
    @GetMapping("/transcode-status/{videoId}")
    public ResponseEntity<ResponseModel<VideoProcess>> getTranscodeStatus(@PathVariable String videoId) {
        VideoProcess status = videoTranscodeService.getTranscodeStatus(videoId);
        return ResponseEntity.ok(ResponseModel.success(status, "Lấy trạng thái xử lý video thành công!"));
    }

    /**
     * TASK-042: Xử lý trích xuất/gán phụ đề VTT đa ngôn ngữ
     */
    @PostMapping(value = "/{movieId}/subtitle", consumes = "multipart/form-data")
    public ResponseEntity<ResponseModel<Map<String, Object>>> uploadSubtitle(
            @PathVariable String movieId,
            @RequestParam String lang, // "vi", "en"
            @RequestParam("file") MultipartFile file) {

        File subDir = new File("uploads/videos/" + movieId + "/subs");
        if (!subDir.exists()) subDir.mkdirs();

        String fileName = "sub_" + lang + "_" + System.currentTimeMillis() + ".vtt";
        File subFile = new File(subDir, fileName);

        try {
            file.transferTo(subFile.getAbsoluteFile());

            Map<String, Object> data = new HashMap<>();
            data.put("movieId", movieId);
            data.put("lang", lang);
            data.put("url", "/hls/" + movieId + "/subs/" + fileName);

            return ResponseEntity.ok(ResponseModel.success(data, "Tải lên phụ đề " + lang + " thành công!"));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Lỗi lưu file phụ đề: " + e.getMessage()));
        }
    }
}
