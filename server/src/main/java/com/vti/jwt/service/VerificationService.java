package com.vti.jwt.service;

import com.vti.jwt.model.User;
import com.vti.jwt.model.VerificationCode;

public interface VerificationService {

    VerificationCode generateAndSendVerificationCode(User user);

    void verifyUser(String email, String code);

    void cleanExpiredUnverifiedUsers();
}
