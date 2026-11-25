package com.vti.jwt.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "upload_sessions")
public class UploadSession {

    @Id
    private String id;

    @Indexed(unique = true)
    private String uploadId;

    private String fileName;

    private long fileSize;

    private int totalChunks;

    private long chunkSize;

    private String movieId;

    private String episodeId;

    private String status; // IN_PROGRESS, COMPLETED, FAILED

    @Builder.Default
    private Set<Integer> uploadedChunks = new HashSet<>();

    private String finalVideoPath;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}

