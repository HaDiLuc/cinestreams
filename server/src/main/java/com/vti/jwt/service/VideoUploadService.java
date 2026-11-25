package com.vti.jwt.service;

import com.vti.jwt.model.UploadSession;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Set;

public interface VideoUploadService {

    UploadSession initUpload(String fileName, long fileSize, int totalChunks, long chunkSize, String movieId, String episodeId);

    void saveChunk(String uploadId, int chunkIndex, MultipartFile file) throws IOException;

    void saveChunk(String uploadId, int chunkIndex, int totalChunks, MultipartFile file) throws IOException;

    Set<Integer> getUploadedChunks(String uploadId);

    File mergeChunks(String uploadId) throws IOException;

    File mergeChunksStream(String uploadId, String fileName, int totalChunks, String movieId) throws IOException;

    void cleanupOrphanUploads();
}

