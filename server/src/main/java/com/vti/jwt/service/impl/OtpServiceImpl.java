package com.vti.jwt.service.impl;

import com.vti.jwt.model.EmailOtp;
import com.vti.jwt.model.OtpType;
import com.vti.jwt.repository.EmailOtpRepository;
import com.vti.jwt.service.EmailService;
import com.vti.jwt.service.OtpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

/**
 * Xử lý nghiệp vụ vòng đời của mã OTP (Sinh mã, xác thực, chống spam, rate limiting và khóa bảo mật)
 */
@Service
public class OtpServiceImpl implements OtpService {

    private static final Logger logger = LoggerFactory.getLogger(OtpServiceImpl.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    
    // Thời hạn hiệu lực của mã OTP: 5 phút
    private static final int OTP_EXPIRY_MINUTES = 5;
    
    // Số lần thử tối đa trước khi mã OTP bị hủy vĩnh viễn (chống tấn công brute-force)
    private static final int MAX_ATTEMPTS = 5;
    
    // Thời gian giãn cách tối thiểu giữa 2 lần gửi mã: 60 giây
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    
    // Giới hạn số lần gửi tối đa trong 1 giờ để chống spam hòm thư
    private static final int MAX_RESEND_PER_HOUR = 5;

    @Autowired
    private EmailOtpRepository emailOtpRepository;

    @Autowired
    private EmailService emailService;

    /**
     * Sinh mã OTP 6 chữ số an toàn và gửi Email bất đồng bộ
     */
    @Override
    public EmailOtp generateAndSendOtp(String email, String username, OtpType type, String tempData) {
        Instant now = Instant.now();

        // 1. Chống Spam: Kiểm tra giới hạn số lần yêu cầu trong 1 giờ
        Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);
        long requestsInLastHour = emailOtpRepository.countByEmailAndCreatedAtAfter(email, oneHourAgo);
        if (requestsInLastHour >= MAX_RESEND_PER_HOUR) {
            throw new IllegalArgumentException(
                    "Bạn đã yêu cầu gửi mã quá " + MAX_RESEND_PER_HOUR + " lần trong vòng 1 giờ. Vui lòng thử lại sau!");
        }

        // 2. Chống Spam: Kiểm tra Cooldown 60 giây giữa các lần yêu cầu
        Optional<EmailOtp> latestOtpOpt = emailOtpRepository
                .findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(email, type);
        if (latestOtpOpt.isPresent()) {
            EmailOtp existing = latestOtpOpt.get();
            long secondsSinceLast = Duration.between(existing.getCreatedAt(), now).getSeconds();
            if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
                long waitSeconds = RESEND_COOLDOWN_SECONDS - secondsSinceLast;
                throw new IllegalArgumentException(
                        "Vui lòng đợi " + waitSeconds + " giây nữa trước khi yêu cầu gửi lại mã OTP mới.");
            }
            // Hủy mã cũ chưa dùng trước khi sinh mã mới
            existing.setUsed(true);
            emailOtpRepository.save(existing);
        }

        // 3. Sinh mã ngẫu nhiên 6 chữ số bằng SecureRandom (000000 - 999999)
        String otpCode = String.format("%06d", RANDOM.nextInt(1_000_000));
        Instant expireAt = now.plus(OTP_EXPIRY_MINUTES, ChronoUnit.MINUTES);

        EmailOtp newOtp = EmailOtp.builder()
                .email(email)
                .otpCode(otpCode)
                .type(type)
                .expireAt(expireAt)
                .isUsed(false)
                .attempts(0)
                .resendCount((int) requestsInLastHour + 1)
                .lastResendAt(now)
                .tempData(tempData)
                .createdAt(now)
                .build();

        EmailOtp saved = emailOtpRepository.save(newOtp);

        // 4. Gọi gửi mail bất đồng bộ qua thread pool riêng biệt
        emailService.sendOtpEmail(email, username, otpCode, type, OTP_EXPIRY_MINUTES);

        return saved;
    }

    /**
     * Xác thực mã OTP người dùng nhập vào:
     * - Kiểm tra tồn tại, trạng thái đã dùng, thời hạn 5 phút.
     * - Tăng biến attempts nếu nhập sai; nếu đạt >= 5 lần thì hủy mã và khóa bảo mật.
     * - Đánh dấu isUsed = true nếu nhập đúng.
     */
    @Override
    public EmailOtp verifyOtp(String email, String otpCode, OtpType type) {
        Instant now = Instant.now();

        EmailOtp otp = emailOtpRepository
                .findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(email, type)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy mã OTP nào đang chờ xác nhận cho email này hoặc mã đã hết hạn."));

        // Kiểm tra thời hạn hiệu lực (5 phút)
        if (otp.getExpireAt().isBefore(now)) {
            otp.setUsed(true);
            emailOtpRepository.save(otp);
            throw new IllegalArgumentException("Mã OTP đã hết hiệu lực (quá hạn 5 phút). Vui lòng yêu cầu mã mới!");
        }

        // Kiểm tra sai mã & Brute-force limit (tối đa 5 lần)
        if (!otp.getOtpCode().equals(otpCode.trim())) {
            int newAttempts = otp.getAttempts() + 1;
            otp.setAttempts(newAttempts);

            if (newAttempts >= MAX_ATTEMPTS) {
                otp.setUsed(true); // Hủy mã lập tức vì lý do bảo mật
                emailOtpRepository.save(otp);
                throw new IllegalArgumentException(
                        "Mã OTP đã bị khóa vì bạn nhập sai quá " + MAX_ATTEMPTS + " lần. Vui lòng yêu cầu gửi lại mã mới!");
            }

            emailOtpRepository.save(otp);
            int remaining = MAX_ATTEMPTS - newAttempts;
            throw new IllegalArgumentException(
                    "Mã OTP không chính xác! Bạn còn " + remaining + " lần thử.");
        }

        // Mã OTP chính xác -> đánh dấu đã sử dụng
        otp.setUsed(true);

        if (type == OtpType.FORGOT_PASSWORD || type == OtpType.FORGOT_PWD) {
            String resetToken = UUID.randomUUID().toString().replace("-", "");
            otp.setResetToken(resetToken);
            // Gia hạn hiệu lực 15 phút để người dùng đổi mật khẩu mới
            otp.setExpireAt(now.plus(15, ChronoUnit.MINUTES));
        }

        return emailOtpRepository.save(otp);
    }

    @Override
    public boolean validateAndConsumeResetToken(String email, String resetToken) {
        if (email == null || resetToken == null || resetToken.isBlank()) {
            return false;
        }
        Optional<EmailOtp> tokenOpt = emailOtpRepository.findTopByEmailAndResetToken(email.trim(), resetToken.trim());
        if (tokenOpt.isEmpty()) {
            return false;
        }
        EmailOtp otp = tokenOpt.get();
        if (otp.getExpireAt() != null && otp.getExpireAt().isBefore(Instant.now())) {
            emailOtpRepository.delete(otp);
            return false;
        }
        otp.setResetToken(null);
        emailOtpRepository.save(otp);
        return true;
    }

    /**
     * Tác vụ nền (Background Scheduled Task) tự động dọn dẹp các mã OTP hết hạn
     * Chạy định kỳ mỗi 15 phút (900,000 ms) bổ trợ cho TTL Index của MongoDB
     */
    @Scheduled(fixedRate = 900000)
    @Override
    public void cleanupExpiredOtps() {
        try {
            Instant now = Instant.now();
            long deletedExpired = emailOtpRepository.deleteByExpireAtBefore(now);
            if (deletedExpired > 0) {
                logger.info("[OTP Background Cleaner] Đã dọn dẹp {} mã OTP hết hạn.", deletedExpired);
            }
        } catch (Exception e) {
            logger.error("[OTP Background Cleaner] Lỗi trong tiến trình dọn dẹp OTP: {}", e.getMessage());
        }
    }
}
