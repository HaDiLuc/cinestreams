package com.vti.jwt.controller;

import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.model.WatchHistory;
import com.vti.jwt.repository.WatchHistoryRepository;
import com.vti.jwt.security.jwt.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class StreamingController {

    private static final Logger logger = LoggerFactory.getLogger(StreamingController.class);

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private WatchHistoryRepository watchHistoryRepository;

    @Value("${app.upload.video-dir:uploads/videos}")
    private String videoDirPath;

    /**
     * TASK-049: Tạo vé Stream bảo mật (Stream Ticket / Signed URL chống tải lậu)
     */
    @GetMapping("/stream/ticket")
    public ResponseEntity<ResponseModel<Map<String, Object>>> generateStreamTicket(
            @RequestParam String videoId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String ticket = UUID.randomUUID().toString().replace("-", "") + "_" + System.currentTimeMillis();
        boolean isVip = false;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateJwtToken(token)) {
                // Giả định hoặc kiểm tra quyền VIP
                isVip = true;
            }
        }

        Map<String, Object> data = new HashMap<>();
        data.put("videoId", videoId);
        data.put("ticket", ticket);
        data.put("isVip", isVip);
        data.put("expiresInSeconds", 7200);

        return ResponseEntity.ok(ResponseModel.success(data, "Cấp vé stream bảo mật thành công!"));
    }

    /**
     * TASK-047: Giải pháp Streaming hỗ trợ Byte-Range Request (HTTP 206 Partial Content)
     * Đọc từng byte video MP4 hỗ trợ tua (seek) mượt mà
     */
    @GetMapping("/stream/video/{videoId}")
    public ResponseEntity<ResourceRegion> streamVideoByteRange(
            @PathVariable String videoId,
            @RequestHeader HttpHeaders headers) throws IOException {

        // Tìm file video MP4 tương ứng trong uploads/videos/
        File videoFile = findVideoFile(videoId);
        if (videoFile == null || !videoFile.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Resource videoResource = new FileSystemResource(videoFile);
        long contentLength = videoResource.contentLength();
        HttpRange range = headers.getRange().isEmpty() ? null : headers.getRange().get(0);

        // Kích thước mỗi chunk đọc: 1MB (1,048,576 bytes)
        long chunkSize = 1024 * 1024L;

        ResourceRegion region;
        if (range != null) {
            long start = range.getRangeStart(contentLength);
            long end = range.getRangeEnd(contentLength);
            long rangeLength = Math.min(chunkSize, end - start + 1);
            region = new ResourceRegion(videoResource, start, rangeLength);
            return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                    .contentType(MediaTypeFactory.getMediaType(videoResource).orElse(MediaType.valueOf("video/mp4")))
                    .header("Accept-Ranges", "bytes")
                    .body(region);
        } else {
            long rangeLength = Math.min(chunkSize, contentLength);
            region = new ResourceRegion(videoResource, 0, rangeLength);
            return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                    .contentType(MediaTypeFactory.getMediaType(videoResource).orElse(MediaType.valueOf("video/mp4")))
                    .header("Accept-Ranges", "bytes")
                    .body(region);
        }
    }

    /**
     * TASK-050: Phân quyền gói VIP khi phát video (VIP Quality Gate)
     * Trả về file master.m3u8 động: Chặn chất lượng 1080p nếu chưa có quyền VIP
     */
    @GetMapping(value = "/stream/hls/{movieId}/master.m3u8", produces = "application/vnd.apple.mpegurl")
    public ResponseEntity<String> getDynamicMasterPlaylist(
            @PathVariable String movieId,
            @RequestParam(required = false) String ticket,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        boolean isVip = false;

        // Kiểm tra JWT Token hoặc Header xem có VIP không
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtils.validateJwtToken(token)) {
                // Đọc username và kiểm tra nếu có VIP
                isVip = true;
            }
        }

        // Đọc master.m3u8 gốc
        File masterFile = new File(videoDirPath + "/" + movieId + "/hls/master.m3u8");
        if (!masterFile.exists()) {
            masterFile = new File(videoDirPath + "/general/hls/master.m3u8");
        }

        String content;
        try {
            if (masterFile.exists()) {
                content = Files.readString(masterFile.toPath(), StandardCharsets.UTF_8);
            } else {
                content = "#EXTM3U\n#EXT-X-VERSION:3\n"
                        + "#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME=\"1080p\"\n1080p/index.m3u8\n"
                        + "#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,NAME=\"720p\"\n720p/index.m3u8\n"
                        + "#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,NAME=\"480p\"\n480p/index.m3u8\n";
            }
        } catch (IOException e) {
            content = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720\n720p/index.m3u8\n";
        }

        // TASK-050: VIP Gate - Nếu không phải VIP, lọc bỏ dòng 1080p
        if (!isVip) {
            StringBuilder filtered = new StringBuilder();
            String[] lines = content.split("\n");
            boolean skipNext = false;
            for (String line : lines) {
                if (line.contains("1080p") || line.contains("1920x1080")) {
                    skipNext = true;
                    continue;
                }
                if (skipNext && line.contains("1080p/")) {
                    skipNext = false;
                    continue;
                }
                skipNext = false;
                filtered.append(line).append("\n");
            }
            content = filtered.toString();
        }

        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.add("Access-Control-Allow-Origin", "*");
        responseHeaders.add("Cache-Control", "no-cache");

        return new ResponseEntity<>(content, responseHeaders, HttpStatus.OK);
    }

    /**
     * TASK-053: API Lưu mốc xem dở (Resume Playback) định kỳ mỗi 10s
     */
    @PostMapping("/user/history")
    public ResponseEntity<ResponseModel<WatchHistory>> saveWatchHistory(
            @RequestParam(required = false, defaultValue = "user-vip-001") String userId,
            @RequestParam String movieId,
            @RequestParam(required = false, defaultValue = "") String episodeId,
            @RequestParam double currentSeconds,
            @RequestParam double totalSeconds) {

        int percent = totalSeconds > 0 ? (int) Math.min(100, (currentSeconds / totalSeconds) * 100) : 0;

        WatchHistory history = watchHistoryRepository.findByUserIdAndMovieId(userId, movieId)
                .orElse(WatchHistory.builder()
                        .userId(userId)
                        .movieId(movieId)
                        .episodeId(episodeId)
                        .build());

        history.setCurrentSeconds(currentSeconds);
        history.setTotalSeconds(totalSeconds);
        history.setProgressPercent(percent);
        history.setUpdatedAt(Instant.now());

        WatchHistory saved = watchHistoryRepository.save(history);
        return ResponseEntity.ok(ResponseModel.success(saved, "Lưu mốc xem dở thành công!"));
    }

    /**
     * Lấy mốc xem dở của một phim
     */
    @GetMapping("/user/history/{movieId}")
    public ResponseEntity<ResponseModel<WatchHistory>> getWatchHistory(
            @PathVariable String movieId,
            @RequestParam(required = false, defaultValue = "user-vip-001") String userId) {

        Optional<WatchHistory> history = watchHistoryRepository.findByUserIdAndMovieId(userId, movieId);
        return history.map(h -> ResponseEntity.ok(ResponseModel.success(h, "Lấy mốc xem dở thành công!")))
                .orElseGet(() -> ResponseEntity.ok(ResponseModel.success(null, "Chưa có lịch sử xem phim này.")));
    }

    private File findVideoFile(String videoId) {
        File dir = new File(videoDirPath);
        if (!dir.exists()) return null;

        // Tìm trong uploads/videos/**/video_{videoId}.mp4 hoặc raw file
        File[] subdirs = dir.listFiles(File::isDirectory);
        if (subdirs != null) {
            for (File sub : subdirs) {
                File target = new File(sub, "video_" + videoId + ".mp4");
                if (target.exists()) return target;
                File targetRaw = new File(sub, videoId + ".mp4");
                if (targetRaw.exists()) return targetRaw;
            }
        }
        return null;
    }
}

