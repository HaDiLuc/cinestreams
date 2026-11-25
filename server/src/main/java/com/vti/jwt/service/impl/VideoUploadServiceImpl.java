package com.vti.jwt.service.impl;

import com.vti.jwt.exception.ResourceNotFoundException;
import com.vti.jwt.model.UploadSession;
import com.vti.jwt.repository.UploadSessionRepository;
import com.vti.jwt.service.VideoUploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class VideoUploadServiceImpl implements VideoUploadService {

    private static final Logger logger = LoggerFactory.getLogger(VideoUploadServiceImpl.class);

    @Autowired
    private UploadSessionRepository uploadSessionRepository;

    @Value("${app.upload.temp-dir:uploads/temp}")
    private String tempDirPath;

    @Value("${app.upload.video-dir:uploads/videos}")
    private String videoDirPath;

    @Override
    public UploadSession initUpload(
            String fileName,
            long fileSize,
            int totalChunks,
            long chunkSize,
            String movieId,
            String episodeId) {

        String uploadId = UUID.randomUUID().toString();
        String safeMovieId = (movieId != null && !movieId.isBlank()) ? movieId : "general";

        // Tạo thư mục tạm uploads/temp/{uploadId} (TASK-017)
        File tempFolder = new File(tempDirPath, uploadId).getAbsoluteFile();
        if (!tempFolder.exists()) {
            tempFolder.mkdirs();
        }

        // Đảm bảo thư mục đích uploads/videos/{movieId} tồn tại
        File targetMovieFolder = new File(videoDirPath, safeMovieId).getAbsoluteFile();
        if (!targetMovieFolder.exists()) {
            targetMovieFolder.mkdirs();
        }

        UploadSession session = UploadSession.builder()
                .uploadId(uploadId)
                .fileName(fileName)
                .fileSize(fileSize)
                .totalChunks(totalChunks)
                .chunkSize(chunkSize > 0 ? chunkSize : 5 * 1024 * 1024)
                .movieId(safeMovieId)
                .episodeId(episodeId)
                .status("IN_PROGRESS")
                .uploadedChunks(new HashSet<>())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return uploadSessionRepository.save(session);
    }

    @Override
    public void saveChunk(String uploadId, int chunkIndex, MultipartFile file) throws IOException {
        saveChunk(uploadId, chunkIndex, 0, file);
    }

    @Override
    public void saveChunk(String uploadId, int chunkIndex, int totalChunks, MultipartFile file) throws IOException {
        File tempFolder = new File(tempDirPath, uploadId).getAbsoluteFile();
        if (!tempFolder.exists()) {
            tempFolder.mkdirs();
        }

        // Lưu file chunk_{chunkIndex} (hoặc part_{chunkIndex})
        File chunkFile = new File(tempFolder, "chunk_" + chunkIndex).getAbsoluteFile();
        File parentDir = chunkFile.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }

        try (var inputStream = file.getInputStream()) {
            Files.copy(inputStream, chunkFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
        }

        // Cập nhật hoặc khởi tạo UploadSession nếu chưa có
        UploadSession session = uploadSessionRepository.findByUploadId(uploadId).orElse(null);
        if (session != null) {
            session.getUploadedChunks().add(chunkIndex);
            if (totalChunks > 0) {
                session.setTotalChunks(totalChunks);
            }
            session.setUpdatedAt(Instant.now());
            uploadSessionRepository.save(session);
            logger.info("[Chunk Upload] Lưu chunk {}/{} cho uploadId: {}",
                    chunkIndex + 1, session.getTotalChunks(), uploadId);
        } else {
            UploadSession newSession = UploadSession.builder()
                    .uploadId(uploadId)
                    .fileName("upload_" + uploadId)
                    .totalChunks(totalChunks > 0 ? totalChunks : 1)
                    .chunkSize(file.getSize())
                    .movieId("general")
                    .status("IN_PROGRESS")
                    .uploadedChunks(new HashSet<>(Collections.singletonList(chunkIndex)))
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            uploadSessionRepository.save(newSession);
            logger.info("[Chunk Upload] Tạo mới session & lưu chunk {} cho uploadId: {}",
                    chunkIndex, uploadId);
        }
    }

    @Override
    public Set<Integer> getUploadedChunks(String uploadId) {
        // Đọc danh sách file thực tế trong folder để đảm bảo tính chính xác
        File tempFolder = new File(tempDirPath, uploadId);
        Set<Integer> actualChunks = new HashSet<>();
        if (tempFolder.exists() && tempFolder.isDirectory()) {
            File[] files = tempFolder.listFiles((dir, name) -> name.startsWith("chunk_") || name.startsWith("part_"));
            if (files != null) {
                for (File f : files) {
                    try {
                        String cleanName = f.getName().replace("chunk_", "").replace("part_", "");
                        int idx = Integer.parseInt(cleanName);
                        actualChunks.add(idx);
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return actualChunks;
    }

    @Override
    public File mergeChunks(String uploadId) throws IOException {
        UploadSession session = uploadSessionRepository.findByUploadId(uploadId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên upload với ID: " + uploadId));

        File tempFolder = new File(tempDirPath, uploadId);
        if (!tempFolder.exists() || !tempFolder.isDirectory()) {
            throw new IOException("Thư mục chunks tạm không tồn tại hoặc đã bị dọn dẹp!");
        }

        // Kiểm tra xem đã đủ chunks chưa
        int totalChunks = session.getTotalChunks();
        for (int i = 0; i < totalChunks; i++) {
            File part = new File(tempFolder, "part_" + i);
            if (!part.exists()) {
                throw new IOException("Thiếu chunk thứ " + i + ". Vui lòng hoàn tất upload toàn bộ các phần!");
            }
        }

        // Đường dẫn file video gốc hoàn chỉnh: uploads/videos/{movieId}/raw_{uploadId}.mp4
        File movieDir = new File(videoDirPath, session.getMovieId()).getAbsoluteFile();
        if (!movieDir.exists()) {
            movieDir.mkdirs();
        }

        String finalFileName = "video_" + uploadId + ".mp4";
        File finalFile = new File(movieDir, finalFileName).getAbsoluteFile();
        File parentDir = finalFile.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }

        logger.info("[Merge Chunks] Bắt đầu ghép {} chunks vào file {}", totalChunks, finalFile.getAbsolutePath());

        // Sử dụng FileChannel để ghép file siêu tốc (TASK-022)
        try (FileOutputStream fos = new FileOutputStream(finalFile);
             FileChannel destChannel = fos.getChannel()) {

            for (int i = 0; i < totalChunks; i++) {
                File partFile = new File(tempFolder, "part_" + i);
                try (FileInputStream fis = new FileInputStream(partFile);
                     FileChannel srcChannel = fis.getChannel()) {
                    long size = srcChannel.size();
                    long transferred = 0;
                    while (transferred < size) {
                        transferred += srcChannel.transferTo(transferred, size - transferred, destChannel);
                    }
                }
            }
        }

        // Cập nhật session trạng thái COMPLETED
        session.setStatus("COMPLETED");
        session.setFinalVideoPath(finalFile.getAbsolutePath());
        session.setUpdatedAt(Instant.now());
        uploadSessionRepository.save(session);

        // Xóa sạch thư mục temp sau khi ghép thành công (TASK-022)
        deleteDirectoryRecursively(tempFolder);
        logger.info("[Merge Chunks] Ghép thành công! Kích thước file: {} bytes. Đã xóa folder temp: {}",
                finalFile.length(), tempFolder.getName());

        return finalFile;
    }

    @Override
    public File mergeChunksStream(String uploadId, String fileName, int totalChunks, String movieId) throws IOException {
        String safeMovieId = (movieId != null && !movieId.isBlank()) ? movieId : "general";
        File tempFolder = new File(tempDirPath, uploadId).getAbsoluteFile();
        if (!tempFolder.exists() || !tempFolder.isDirectory()) {
            throw new IOException("Thư mục chunks tạm không tồn tại hoặc đã bị dọn dẹp: " + uploadId);
        }

        // Kiểm tra toàn bộ chunks từ 0 đến totalChunks - 1
        for (int i = 0; i < totalChunks; i++) {
            File chunk = new File(tempFolder, "chunk_" + i);
            if (!chunk.exists()) {
                chunk = new File(tempFolder, "part_" + i);
            }
            if (!chunk.exists()) {
                throw new IOException("Thiếu chunk thứ " + i + ". Vui lòng hoàn tất upload toàn bộ " + totalChunks + " chunks!");
            }
        }

        // Tạo file đích .mp4 tại thư mục video gốc
        File movieDir = new File(videoDirPath, safeMovieId).getAbsoluteFile();
        if (!movieDir.exists()) {
            movieDir.mkdirs();
        }

        String safeFileName = (fileName != null && !fileName.isBlank()) ? fileName : ("video_" + uploadId + ".mp4");
        if (!safeFileName.toLowerCase().endsWith(".mp4")) {
            safeFileName += ".mp4";
        }
        File targetFile = new File(movieDir, "raw_" + uploadId + "_" + safeFileName).getAbsoluteFile();
        if (targetFile.getParentFile() != null && !targetFile.getParentFile().exists()) {
            targetFile.getParentFile().mkdirs();
        }

        logger.info("[Merge Stream] Bắt đầu ghép {} chunks vào file {}", totalChunks, targetFile.getAbsolutePath());

        // Sử dụng FileOutputStream kết hợp BufferedOutputStream duyệt từ chunk_0 đến chunk_{totalChunks - 1}
        try (FileOutputStream fos = new FileOutputStream(targetFile);
             BufferedOutputStream bos = new BufferedOutputStream(fos)) {
            byte[] buffer = new byte[64 * 1024]; // 64KB buffer
            for (int i = 0; i < totalChunks; i++) {
                File chunk = new File(tempFolder, "chunk_" + i);
                if (!chunk.exists()) {
                    chunk = new File(tempFolder, "part_" + i);
                }
                try (FileInputStream fis = new FileInputStream(chunk);
                     BufferedInputStream bis = new BufferedInputStream(fis)) {
                    int bytesRead;
                    while ((bytesRead = bis.read(buffer)) != -1) {
                        bos.write(buffer, 0, bytesRead);
                    }
                }
            }
            bos.flush();
        }

        // Cập nhật UploadSession nếu có
        uploadSessionRepository.findByUploadId(uploadId).ifPresent(session -> {
            session.setStatus("COMPLETED");
            session.setFinalVideoPath(targetFile.getAbsolutePath());
            session.setUpdatedAt(Instant.now());
            uploadSessionRepository.save(session);
        });

        // Xóa toàn bộ file tạm và thư mục uploads/temp/{uploadId}/ sau khi ghép xong
        deleteDirectoryRecursively(tempFolder);
        logger.info("[Merge Stream] Ghép thành công! File size: {} bytes. Đã giải phóng folder temp: {}",
                targetFile.length(), tempFolder.getName());

        return targetFile;
    }

    /**
     * TASK-024: Scheduled Job dọn dẹp thư mục temp upload quá 24h
     * Chạy định kỳ mỗi 60 phút
     */
    @Scheduled(fixedRate = 3600000)
    @Override
    public void cleanupOrphanUploads() {
        try {
            Instant dayAgo = Instant.now().minus(24, ChronoUnit.HOURS);
            List<UploadSession> orphanSessions = uploadSessionRepository.findAllByCreatedAtBeforeAndStatus(dayAgo, "IN_PROGRESS");

            for (UploadSession s : orphanSessions) {
                File tempFolder = new File(tempDirPath, s.getUploadId());
                if (tempFolder.exists()) {
                    deleteDirectoryRecursively(tempFolder);
                }
                s.setStatus("ABANDONED");
                uploadSessionRepository.save(s);
                logger.info("[Upload Orphan Cleaner] Đã dọn dẹp upload quá 24h: {}", s.getUploadId());
            }
        } catch (Exception e) {
            logger.error("[Upload Orphan Cleaner] Lỗi dọn dẹp: {}", e.getMessage());
        }
    }

    private void deleteDirectoryRecursively(File dir) {
        if (dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) {
                    deleteDirectoryRecursively(f);
                }
            }
        }
        dir.delete();
    }
}

