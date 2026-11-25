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
@Document(collection = "movies")
public class MovieEntity {

    @Id
    private String id;

    private String title;

    private String originalTitle;

    @Indexed(unique = true)
    private String slug;

    private String synopsis;

    private String poster;

    private String backdrop;

    @Builder.Default
    private List<String> genres = new ArrayList<>();

    @Builder.Default
    private double imdbRating = 8.5;

    private int releaseYear;

    private String ageRating; // "18+", "16+", "13+", "K"

    private String badge; // "MỚI", "HOT", "TOP 1"

    @Builder.Default
    private String qualityBadge = "4K ULTRA HD";

    @Builder.Default
    private String audioBadge = "DOLBY ATMOS";

    private String director;

    @Builder.Default
    private List<String> cast = new ArrayList<>();

    @Builder.Default
    private String type = "movie"; // "movie", "series", "anime"

    @Builder.Default
    private String status = "DRAFT"; // "DRAFT", "PUBLISHED"

    @Builder.Default
    private long views = 0;

    private String duration;

    private String trailerUrl;

    private String streamUrl;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}

