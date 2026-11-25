package com.vti.jwt.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.time.Duration;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.video-dir:uploads/videos}")
    private String videoDirPath;

    @Value("${app.upload.dir:uploads}")
    private String uploadDirPath;

    /**
     * TASK-046: Cấu hình ResourceHandler phục vụ file HLS tĩnh trong Spring Boot
     * TASK-048: Cấu hình Cache-Control cho Streaming Server
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File videoDir = new File(videoDirPath).getAbsoluteFile();
        if (!videoDir.exists()) {
            videoDir.mkdirs();
        }

        String videoLocation = videoDir.toURI().toString();
        if (!videoLocation.endsWith("/")) {
            videoLocation += "/";
        }

        // Map /hls/** tới thư mục lưu trữ HLS và video
        registry.addResourceHandler("/hls/**")
                .addResourceLocations(videoLocation)
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic());

        // Map /uploads/** cho static uploads (posters, thumbnails, subs)
        File uploadDir = new File(uploadDirPath).getAbsoluteFile();
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        String uploadLocation = uploadDir.toURI().toString();
        if (!uploadLocation.endsWith("/")) {
            uploadLocation += "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadLocation)
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic());
    }
}

