package com.vti.jwt.service.impl;

import com.vti.jwt.exception.ResourceNotFoundException;
import com.vti.jwt.model.User;
import com.vti.jwt.model.VerificationCode;
import com.vti.jwt.repository.UserRepository;
import com.vti.jwt.repository.VerificationCodeRepository;
import com.vti.jwt.service.EmailService;
import com.vti.jwt.service.VerificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
public class VerificationServiceImpl implements VerificationService {

    private static final Logger logger = LoggerFactory.getLogger(VerificationServiceImpl.class);
    private static final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    private VerificationCodeRepository verificationCodeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Value("${app.auth.verification.expiration-minutes:10}")
    private long expirationMinutes;

    @Override
    public VerificationCode generateAndSendVerificationCode(User user) {
        // 1. Xóa các mã cũ chưa hoàn thành của email này
        verificationCodeRepository.deleteByEmail(user.getEmail());

        // 2. Sinh mã 6 số ngẫu nhiên đảm bảo không trùng với các mã đang còn hiệu lực
        String code = generateUniqueRandomCode();

        // 3. Thời hạn hiệu lực: 10 phút
        Instant expiryDate = Instant.now().plus(expirationMinutes, ChronoUnit.MINUTES);

        // Cập nhật hạn xác minh cho User
        user.setVerificationExpiryDate(expiryDate);
        user.setVerified(false);
        userRepository.save(user);

        // Lưu VerificationCode
        VerificationCode verificationCode = new VerificationCode(code, user.getEmail(), user.getId(), expiryDate);
        VerificationCode savedCode = verificationCodeRepository.save(verificationCode);

        // 4. Gửi email xác minh chứa HTML content
        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), code);

        return savedCode;
    }

    @Override
    public void verifyUser(String email, String code) {
        Instant now = Instant.now();

        // 1. Kiểm tra User tồn tại
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy thông tin tài khoản với email: " + email);
        }

        User user = userOpt.get();

        // 2. Nếu user đã được xác minh trước đó
        if (user.isVerified()) {
            throw new IllegalArgumentException("Tài khoản này đã được xác minh kích hoạt trước đó rồi!");
        }

        // 3. Kiểm tra nếu quá 10 phút mà chưa xác minh: xóa tài khoản tạm thời
        if (user.getVerificationExpiryDate() != null && user.getVerificationExpiryDate().isBefore(now)) {
            userRepository.delete(user);
            verificationCodeRepository.deleteByEmail(email);
            throw new IllegalArgumentException("Mã xác minh đã quá hạn 10 phút! Tài khoản tạm thời đã bị hủy và xóa khỏi hệ thống. Vui lòng đăng ký lại.");
        }

        // 4. Kiểm tra mã xác minh
        Optional<VerificationCode> codeOpt = verificationCodeRepository.findByEmailAndCodeAndVerifiedFalse(email, code);
        if (codeOpt.isEmpty()) {
            throw new IllegalArgumentException("Mã xác minh không chính xác!");
        }

        VerificationCode verificationCode = codeOpt.get();

        // 5. Kiểm tra thời hạn của mã xác minh
        if (verificationCode.getExpiryDate().isBefore(now)) {
            userRepository.delete(user);
            verificationCodeRepository.deleteByEmail(email);
            throw new IllegalArgumentException("Mã xác minh đã hết hạn (quá 10 phút)! Tài khoản tạm thời đã bị xóa khỏi hệ thống. Vui lòng đăng ký lại.");
        }

        // 6. Xác minh thành công: kích hoạt User
        user.setVerified(true);
        user.setVerificationExpiryDate(null);
        userRepository.save(user);

        // Đánh dấu mã đã dùng
        verificationCode.setVerified(true);
        verificationCodeRepository.save(verificationCode);

        logger.info("Tài khoản [{}] đã được xác minh thành công qua email [{}]", user.getUsername(), email);
    }

    @Override
    public void cleanExpiredUnverifiedUsers() {
        Instant now = Instant.now();
        List<User> allUsers = userRepository.findAll();

        for (User user : allUsers) {
            if (!user.isVerified() && user.getVerificationExpiryDate() != null && user.getVerificationExpiryDate().isBefore(now)) {
                logger.info("Tự động dọn dẹp tài khoản tạm thời hết hạn 10 phút: username={}, email={}", user.getUsername(), user.getEmail());
                userRepository.delete(user);
                verificationCodeRepository.deleteByEmail(user.getEmail());
            }
        }
    }

    /**
     * Sinh mã 6 số ngẫu nhiên từ 100000 đến 999999 và kiểm tra không trùng lặp
     * với bất kỳ mã nào đang hoạt động
     */
    private String generateUniqueRandomCode() {
        String code;
        int maxAttempts = 100;
        int attempts = 0;
        Instant now = Instant.now();

        do {
            int number = 100000 + secureRandom.nextInt(900000);
            code = String.valueOf(number);
            attempts++;
            if (attempts > maxAttempts) {
                // Fallback nếu xác suất hiếm khi trùng quá nhiều
                break;
            }
        } while (verificationCodeRepository.existsByCodeAndExpiryDateAfterAndVerifiedFalse(code, now));

        return code;
    }
}
