package com.vti.jwt.repository;

import com.vti.jwt.model.EpisodeEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EpisodeRepository extends MongoRepository<EpisodeEntity, String> {

    List<EpisodeEntity> findAllByMovieId(String movieId);

    List<EpisodeEntity> findAllByMovieIdOrderBySeasonNumberAscEpisodeNumberAsc(String movieId);

    List<EpisodeEntity> findAllByMovieIdAndProcessStatus(String movieId, String processStatus);

    Optional<EpisodeEntity> findByMovieIdAndSeasonNumberAndEpisodeNumber(String movieId, int seasonNumber, int episodeNumber);

    void deleteAllByMovieId(String movieId);
}

