package com.vti.jwt.repository;

import com.vti.jwt.model.EmailOtp;
import com.vti.jwt.model.OtpType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Repository thao tác với MongoDB Collection 'email_otps'
 */
@Repository
public interface EmailOtpRepository extends MongoRepository<EmailOtp, String> {

    /**
     * Tìm mã OTP mới nhất chưa sử dụng theo Email và Loại xác thực
     */
    Optional<EmailOtp> findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(String email, OtpType type);

    /**
     * Tìm bản ghi OTP theo Email và resetToken dùng một lần
     */
    Optional<EmailOtp> findTopByEmailAndResetTokenAndIsUsedFalse(String email, String resetToken);

    /**
     * Tìm bản ghi OTP theo Email và resetToken (sau khi đã verify OTP)
     */
    Optional<EmailOtp> findTopByEmailAndResetToken(String email, String resetToken);

    /**
     * Xóa các mã OTP cũ theo email và loại xác thực
     */
    void deleteByEmailAndType(String email, OtpType type);

    /**
     * Xóa các mã OTP đã quá hạn thời gian chỉ định
     */
    long deleteByExpireAtBefore(Instant time);

    /**
     * Xóa các mã OTP đã được sử dụng thành công
     */
    long deleteByIsUsedTrue();

    /**
     * Đếm số lần gửi mã OTP tới một email trong khoảng thời gian nhất định (phục vụ Rate Limiting)
     */
    long countByEmailAndCreatedAtAfter(String email, Instant time);

    /**
     * Lấy toàn bộ lịch sử OTP của một email sắp xếp giảm dần theo thời gian tạo
     */
    List<EmailOtp> findAllByEmailOrderByCreatedAtDesc(String email);
}
