package com.vti.jwt.service;

import com.vti.jwt.model.EmailOtp;
import com.vti.jwt.model.OtpType;

public interface OtpService {

    EmailOtp generateAndSendOtp(String email, String username, OtpType type, String tempData);

    EmailOtp verifyOtp(String email, String otpCode, OtpType type);

    boolean validateAndConsumeResetToken(String email, String resetToken);

    void cleanupExpiredOtps();
}

