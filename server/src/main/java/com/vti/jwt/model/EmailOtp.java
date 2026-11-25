package com.vti.jwt.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * MongoDB Entity đại diện cho mã xác thực OTP (One-Time Password) gửi qua Email.
 * Collection: email_otps
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "email_otps")
public class EmailOtp {

    @Id
    private String id;

    /**
     * Địa chỉ email nhận mã OTP
     */
    @Indexed
    private String email;

    /**
     * Mã số xác thực gồm 6 chữ số (sinh ngẫu nhiên bằng SecureRandom)
     */
    private String otpCode;

    /**
     * Loại xác thực: REGISTER, LOGIN, LOGIN_2FA, FORGOT_PASSWORD, FORGOT_PWD
     */
    private OtpType type;

    /**
     * Thời điểm hết hạn của mã OTP (thông thường là 5 phút kể từ lúc sinh mã).
     * Đánh chỉ mục TTL (Time-To-Live) expireAfterSeconds = 0:
     * MongoDB background thread (mỗi 60s) sẽ tự động kiểm tra và xóa vĩnh viễn các document
     * khi thời gian hiện tại vượt quá giá trị của expireAt, giúp giải phóng dung lượng DB.
     */
    @Indexed(expireAfterSeconds = 0)
    private Instant expireAt;

    /**
     * Trạng thái đã được sử dụng thành công hay chưa
     */
    @Builder.Default
    private boolean isUsed = false;

    /**
     * Bộ đếm số lần người dùng nhập sai mã OTP.
     * Tối đa 5 lần; nếu vượt quá 5 lần thì mã OTP sẽ bị vô hiệu hóa lập tức để chống tấn công Brute-force.
     */
    @Builder.Default
    private int attempts = 0;

    /**
     * Số lần yêu cầu gửi lại trong khung thời gian chống spam
     */
    @Builder.Default
    private int resendCount = 0;

    /**
     * Thời điểm yêu cầu gửi lại gần nhất
     */
    private Instant lastResendAt;

    /**
     * Mã token tạm thời phục vụ luồng reset password một lần
     */
    private String resetToken;

    /**
     * Dữ liệu tạm thời (nếu cần lưu metadata JSON)
     */
    private String tempData;

    /**
     * Thời điểm tạo bản ghi
     */
    @Builder.Default
    private Instant createdAt = Instant.now();
}
