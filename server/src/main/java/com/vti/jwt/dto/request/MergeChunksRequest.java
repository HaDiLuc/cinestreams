package com.vti.jwt.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MergeChunksRequest {

    private String uploadId;

    private String fileName;

    private int totalChunks;

    private String movieId;

    private Integer episodeNumber;

    private String episodeId;
}

