package com.vti.jwt.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Cấu hình xử lý bất đồng bộ (Asynchronous Execution) cho CineStreams.
 * Cung cấp ThreadPoolTaskExecutor riêng biệt cho tác vụ gửi Email OTP qua Gmail SMTP,
 * giúp tách biệt tiến trình gửi mail khỏi luồng xử lý HTTP request chính (Non-blocking I/O),
 * ngăn chặn tình trạng treo/đơ request của người dùng khi máy chủ SMTP phản hồi chậm.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger logger = LoggerFactory.getLogger(AsyncConfig.class);

    /**
     * Bean ThreadPoolTaskExecutor riêng biệt dành cho gửi Email
     * - corePoolSize = 5: Luôn duy trì tối thiểu 5 worker threads sẵn sàng phục vụ.
     * - maxPoolSize = 20: Cho phép mở rộng tối đa lên đến 20 threads khi lượng người dùng đăng ký/yêu cầu OTP tăng đột biến.
     * - queueCapacity = 100: Hàng đợi lưu trữ tối đa 100 tác vụ gửi mail khi toàn bộ threads đều bận.
     * - threadNamePrefix: "CineStreams-Mail-" để dễ theo dõi và chẩn đoán log trong môi trường production.
     */
    @Bean(name = "mailTaskExecutor")
    public Executor mailTaskExecutor() {
        logger.info("[AsyncConfig] Khởi tạo mailTaskExecutor dành riêng cho việc gửi Email OTP...");
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("CineStreams-Mail-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    /**
     * Bean ThreadPoolTaskExecutor riêng biệt dành cho tác vụ transcode video HLS bằng FFmpeg ngầm
     * Giới hạn corePoolSize = 2, maxPoolSize = 4 để bảo vệ CPU VPS không bị quá tải.
     */
    @Bean(name = "videoTranscodeExecutor")
    public Executor videoTranscodeExecutor() {
        logger.info("[AsyncConfig] Khởi tạo videoTranscodeExecutor dành cho FFmpeg HLS transcoding...");
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("CineStreams-Transcode-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
}

