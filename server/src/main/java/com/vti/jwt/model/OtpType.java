package com.vti.jwt.model;

/**
 * Phân loại mục đích sử dụng mã OTP trong hệ thống CineStreams:
 * - REGISTER: Kích hoạt tài khoản mới đăng ký
 * - LOGIN / LOGIN_2FA: Xác thực 2 bước (2FA) khi đăng nhập
 * - FORGOT_PASSWORD / FORGOT_PWD: Xác thực cấp lại mật khẩu mới
 */
public enum OtpType {
    REGISTER,
    LOGIN,
    LOGIN_2FA,
    FORGOT_PASSWORD,
    FORGOT_PWD
}
