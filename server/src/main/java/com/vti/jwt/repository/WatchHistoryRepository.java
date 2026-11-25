package com.vti.jwt.repository;

import com.vti.jwt.model.WatchHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WatchHistoryRepository extends MongoRepository<WatchHistory, String> {

    Optional<WatchHistory> findByUserIdAndMovieId(String userId, String movieId);

    List<WatchHistory> findAllByUserIdOrderByUpdatedAtDesc(String userId);
}

