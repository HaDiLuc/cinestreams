package com.vti.jwt.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndex(name = "user_movie_idx", def = "{'userId': 1, 'movieId': 1}", unique = true)
@Document(collection = "watch_histories")
public class WatchHistory {

    @Id
    private String id;

    private String userId;

    private String movieId;

    private String episodeId;

    private int seasonNumber;

    private int episodeNumber;

    private double currentSeconds;

    private double totalSeconds;

    private int progressPercent;

    @Builder.Default
    private Instant updatedAt = Instant.now();
}

