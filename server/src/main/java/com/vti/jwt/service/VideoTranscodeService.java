package com.vti.jwt.service;

import com.vti.jwt.model.VideoProcess;

import java.io.File;

public interface VideoTranscodeService {

    VideoProcess enqueueVideoTranscode(String videoId, String movieId, String episodeId, File sourceFile);

    void processVideoAsync(String videoId);

    void transcodeToHlsAsync(String videoId, String movieId, String episodeId, File sourceFile);

    VideoProcess getTranscodeStatus(String videoId);

    void cancelTranscode(String videoId);
}

