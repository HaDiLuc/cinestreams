package com.vti.jwt.repository;

import com.vti.jwt.model.MovieEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MovieRepository extends MongoRepository<MovieEntity, String> {

    Optional<MovieEntity> findBySlug(String slug);

    List<MovieEntity> findAllByStatus(String status);

    List<MovieEntity> findAllByType(String type);

    List<MovieEntity> findAllByTypeAndStatus(String type, String status);

    List<MovieEntity> findByTitleContainingIgnoreCaseOrOriginalTitleContainingIgnoreCase(String title, String orig);
}

