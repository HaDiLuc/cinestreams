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
@Document(collection = "video_processes")
public class VideoProcess {

    @Id
    private String id;

    @Indexed(unique = true)
    private String videoId;

    private String movieId;

    private String episodeId;

    private String sourceFilePath;

    private String status; // PENDING, PROCESSING, COMPLETED, FAILED

    private int percent; // 0 - 100

    private String stage; // "Khởi tạo", "Đang trích xuất Metadata", "Đang nén 1080p", "Đang nén 720p", "Tạo Master Playlist", "Hoàn tất"

    private double durationSeconds;

    private int width;

    private int height;

    private String bitrate;

    private String fps;

    private String audioCodec;

    private String videoCodec;

    private String masterPlaylistUrl;

    @Builder.Default
    private List<String> thumbnails = new ArrayList<>();

    @Builder.Default
    private List<String> subtitles = new ArrayList<>();

    private String errorLog;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}

