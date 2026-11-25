package com.vti.jwt.repository;

import com.vti.jwt.model.VideoProcess;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VideoProcessRepository extends MongoRepository<VideoProcess, String> {

    Optional<VideoProcess> findByVideoId(String videoId);

    Optional<VideoProcess> findTopByMovieIdOrderByCreatedAtDesc(String movieId);

    Optional<VideoProcess> findTopByEpisodeIdOrderByCreatedAtDesc(String episodeId);
}

