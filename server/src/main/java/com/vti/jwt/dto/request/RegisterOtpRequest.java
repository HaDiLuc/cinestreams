package com.vti.jwt.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * DTO nhận dữ liệu gửi OTP đăng ký (tương thích cả payload có username hoặc fullName)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterOtpRequest {

    /**
     * Tên đăng nhập (tùy chọn; nếu trống hệ thống tự sinh từ email/fullName)
     */
    private String username;

    /**
     * Họ và tên đầy đủ
     */
    private String fullName;

    /**
     * Email nhận mã xác thực OTP
     */
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    private String email;

    /**
     * Mật khẩu tài khoản
     */
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 40, message = "Mật khẩu tối thiểu 6 ký tự")
    private String password;

    /**
     * Danh sách vai trò (mặc định ROLE_USER)
     */
    private Set<String> roles;
}
