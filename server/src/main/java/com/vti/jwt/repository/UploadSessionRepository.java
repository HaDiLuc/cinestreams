package com.vti.jwt.repository;

import com.vti.jwt.model.UploadSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface UploadSessionRepository extends MongoRepository<UploadSession, String> {

    Optional<UploadSession> findByUploadId(String uploadId);

    List<UploadSession> findAllByCreatedAtBeforeAndStatus(Instant time, String status);

    void deleteByUploadId(String uploadId);
}

