package com.vti.jwt.service.impl;

import com.vti.jwt.service.StorageService;
import io.minio.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;

/**
 * Triển khai lưu trữ Video HLS & Chunks trên MinIO S3 Object Storage
 */
@Service
@ConditionalOnProperty(name = "storage.type", havingValue = "minio")
public class MinioStorageServiceImpl implements StorageService {

    private static final Logger logger = LoggerFactory.getLogger(MinioStorageServiceImpl.class);

    @Value("${minio.endpoint:http://127.0.0.1:9000}")
    private String endpoint;

    @Value("${minio.access-key:minioadmin}")
    private String accessKey;

    @Value("${minio.secret-key:minioadmin}")
    private String secretKey;

    @Value("${minio.bucket:${minio.bucket-name:cinestreams}}")
    private String bucketName;

    @Value("${minio.public-url:http://127.0.0.1:9000/cinestreams}")
    private String publicUrl;

    private MinioClient minioClient;

    @PostConstruct
    public void init() {
        try {
            this.minioClient = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();

            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                logger.info("[MinIO Storage] Đã tạo thành công bucket mới: {}", bucketName);
            } else {
                logger.info("[MinIO Storage] Kết nối thành công tới MinIO bucket: {}", bucketName);
            }
        } catch (Exception e) {
            logger.error("[MinIO Storage] Lỗi khởi tạo kết nối MinIO: {}", e.getMessage(), e);
        }
    }

    @Override
    public String storeHlsDirectory(File hlsDirectory, String relativePathPrefix) {
        String cleanPrefix = relativePathPrefix.startsWith("/") ? relativePathPrefix.substring(1) : relativePathPrefix;
        if (!hlsDirectory.exists() || !hlsDirectory.isDirectory()) {
            logger.warn("[MinIO Storage] Thư mục HLS không tồn tại: {}", hlsDirectory.getAbsolutePath());
            return getPublicUrl(cleanPrefix + "/master.m3u8");
        }

        logger.info("[MinIO Storage] Bắt đầu tải lên thư mục HLS: {} vào prefix: {}",
                hlsDirectory.getName(), cleanPrefix);

        uploadDirectoryRecursively(hlsDirectory, cleanPrefix, hlsDirectory.getAbsolutePath());

        String masterUrl = getPublicUrl(cleanPrefix + "/master.m3u8");
        logger.info("[MinIO Storage] Hoàn tất tải HLS lên MinIO. URL: {}", masterUrl);
        return masterUrl;
    }

    private void uploadDirectoryRecursively(File current, String prefix, String baseDirPath) {
        File[] files = current.listFiles();
        if (files == null) return;

        for (File file : files) {
            if (file.isDirectory()) {
                uploadDirectoryRecursively(file, prefix, baseDirPath);
            } else {
                String fullPath = file.getAbsolutePath();
                String relativePath = fullPath.substring(baseDirPath.length()).replace("\\", "/");
                if (relativePath.startsWith("/")) {
                    relativePath = relativePath.substring(1);
                }
                String objectKey = prefix + "/" + relativePath;

                uploadSingleFile(file, objectKey);
            }
        }
    }

    private void uploadSingleFile(File file, String objectKey) {
        try {
            String contentType = determineContentType(file.getName());
            minioClient.uploadObject(
                    UploadObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .filename(file.getAbsolutePath())
                            .contentType(contentType)
                            .build()
            );
            logger.debug("[MinIO Storage] Uploaded: {} -> {}", file.getName(), objectKey);
        } catch (Exception e) {
            logger.error("[MinIO Storage] Lỗi upload file {} lên MinIO: {}", file.getName(), e.getMessage());
        }
    }

    private String determineContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".m3u8")) {
            return "application/vnd.apple.mpegurl";
        } else if (lower.endsWith(".ts")) {
            return "video/mp2t";
        } else if (lower.endsWith(".mp4")) {
            return "video/mp4";
        } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (lower.endsWith(".png")) {
            return "image/png";
        } else if (lower.endsWith(".vtt")) {
            return "text/vtt";
        }
        return "application/octet-stream";
    }

    @Override
    public String storeFile(File file, String targetRelativePath) {
        String cleanPath = targetRelativePath.startsWith("/") ? targetRelativePath.substring(1) : targetRelativePath;
        uploadSingleFile(file, cleanPath);
        return getPublicUrl(cleanPath);
    }

    @Override
    public String getPublicUrl(String relativePath) {
        String cleanPath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
        String base = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
        return base + "/" + cleanPath;
    }

    @Override
    public boolean delete(String relativePath) {
        try {
            String cleanPath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(cleanPath)
                            .build()
            );
            return true;
        } catch (Exception e) {
            logger.error("[MinIO Storage] Lỗi xóa file {}: {}", relativePath, e.getMessage());
            return false;
        }
    }
}

