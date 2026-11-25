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
 * DTO nhận dữ liệu yêu cầu đăng ký tài khoản bước 1 qua Email & OTP
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    /**
     * Địa chỉ Email của người dùng (bắt buộc, đúng định dạng)
     */
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    private String email;

    /**
     * Mật khẩu đăng nhập (tối thiểu 6 ký tự)
     */
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 40, message = "Mật khẩu phải từ 6 đến 40 ký tự")
    private String password;

    /**
     * Họ và tên đầy đủ của người dùng
     */
    @NotBlank(message = "Họ và tên không được để trống")
    @Size(min = 2, max = 100, message = "Họ tên phải từ 2 đến 100 ký tự")
    private String fullName;

    /**
     * Tên đăng nhập (tùy chọn, nếu để trống hệ thống tự sinh từ email hoặc họ tên)
     */
    private String username;

    /**
     * Danh sách vai trò gán ban đầu (mặc định ROLE_USER nếu để trống)
     */
    private Set<String> roles;
}

