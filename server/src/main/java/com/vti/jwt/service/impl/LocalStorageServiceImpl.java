package com.vti.jwt.service.impl;

import com.vti.jwt.service.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

/**
 * Triển khai lưu trữ trực tiếp trên Local Disk (phục vụ qua Nginx Static Web Server)
 */
@Service
@ConditionalOnProperty(name = "storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageServiceImpl implements StorageService {

    private static final Logger logger = LoggerFactory.getLogger(LocalStorageServiceImpl.class);

    @Value("${app.upload.video-dir:uploads/videos}")
    private String videoDirPath;

    @Override
    public String storeHlsDirectory(File hlsDirectory, String relativePathPrefix) {
        String cleanPrefix = relativePathPrefix.startsWith("/") ? relativePathPrefix.substring(1) : relativePathPrefix;
        logger.info("[LocalStorage] HLS stream sẵn sàng tại thư mục local: {} -> prefix: {}",
                hlsDirectory.getAbsolutePath(), cleanPrefix);
        return "/hls/" + cleanPrefix + "/master.m3u8";
    }

    @Override
    public String storeFile(File file, String targetRelativePath) {
        String cleanPath = targetRelativePath.startsWith("/") ? targetRelativePath.substring(1) : targetRelativePath;
        File destFile = new File(videoDirPath, cleanPath).getAbsoluteFile();

        if (!destFile.getParentFile().exists()) {
            destFile.getParentFile().mkdirs();
        }

        try {
            if (!file.getAbsolutePath().equals(destFile.getAbsolutePath())) {
                Files.copy(file.toPath(), destFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }
            logger.info("[LocalStorage] Đã lưu file: {}", destFile.getAbsolutePath());
            return "/hls/" + cleanPath;
        } catch (IOException e) {
            logger.error("[LocalStorage] Lỗi lưu file {}: {}", destFile.getAbsolutePath(), e.getMessage());
            throw new RuntimeException("Lỗi lưu file local: " + e.getMessage(), e);
        }
    }

    @Override
    public String getPublicUrl(String relativePath) {
        String cleanPath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
        return "/hls/" + cleanPath;
    }

    @Override
    public boolean delete(String relativePath) {
        String cleanPath = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
        File target = new File(videoDirPath, cleanPath);
        if (target.exists()) {
            return deleteRecursively(target);
        }
        return false;
    }

    private boolean deleteRecursively(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        return file.delete();
    }
}

