package com.vti.jwt.repository;

import com.vti.jwt.model.VerificationCode;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends MongoRepository<VerificationCode, String> {

    Optional<VerificationCode> findByEmailAndCodeAndVerifiedFalse(String email, String code);

    boolean existsByCodeAndExpiryDateAfterAndVerifiedFalse(String code, Instant now);

    void deleteByUserId(String userId);

    void deleteByEmail(String email);

    void deleteByExpiryDateBefore(Instant now);
}
