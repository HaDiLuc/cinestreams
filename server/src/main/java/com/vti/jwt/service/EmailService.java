package com.vti.jwt.service;

import com.vti.jwt.model.OtpType;

public interface EmailService {

    void sendVerificationEmail(String toEmail, String username, String code);

    void sendOtpEmail(String toEmail, String username, String code, OtpType type, int expiryMinutes);
}
