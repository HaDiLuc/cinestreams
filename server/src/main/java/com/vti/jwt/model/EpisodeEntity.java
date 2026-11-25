package com.vti.jwt.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "episodes")
public class EpisodeEntity {

    @Id
    private String id;

    @Indexed
    private String movieId;

    @Builder.Default
    private int seasonNumber = 1;

    private int episodeNumber;

    private String title;

    private String duration;

    private double durationSeconds;

    private String thumbnail;

    private String synopsis;

    private String videoMasterUrl;

    private String hlsMasterUrl;

    private String mp4FallbackUrl;

    @Builder.Default
    private String processStatus = "PENDING"; // PENDING, PROCESSING, COMPLETED, FAILED

    @Builder.Default
    private List<String> subtitles = new ArrayList<>();

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}

