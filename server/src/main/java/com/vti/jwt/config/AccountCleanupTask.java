package com.vti.jwt.config;

import com.vti.jwt.service.VerificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AccountCleanupTask {

    private static final Logger logger = LoggerFactory.getLogger(AccountCleanupTask.class);

    @Autowired
    private VerificationService verificationService;

    /**
     * Chạy mỗi 60 giây để quét và xóa các tài khoản tạm thời quá 10 phút chưa xác minh
     */
    @Scheduled(fixedRate = 60000)
    public void cleanupExpiredAccounts() {
        try {
            verificationService.cleanExpiredUnverifiedUsers();
        } catch (Exception e) {
            logger.error("Lỗi trong quá trình dọn dẹp tài khoản tạm thời hết hạn: {}", e.getMessage());
        }
    }
}
