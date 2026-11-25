package com.vti.jwt.controller;

import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.exception.ResourceNotFoundException;
import com.vti.jwt.model.EpisodeEntity;
import com.vti.jwt.model.MovieEntity;
import com.vti.jwt.repository.EpisodeRepository;
import com.vti.jwt.repository.MovieRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class MovieController {

    private static final Logger logger = LoggerFactory.getLogger(MovieController.class);

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private EpisodeRepository episodeRepository;

    @Value("${app.upload.video-dir:uploads/videos}")
    private String videoDirPath;

    // ==========================================================
    // Public Endpoints for Viewers (TASK-064)
    // ==========================================================

    @GetMapping("/movies")
    public ResponseEntity<ResponseModel<List<MovieEntity>>> getAllPublicMovies(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {

        List<MovieEntity> movies;
        if (search != null && !search.isBlank()) {
            movies = movieRepository.findByTitleContainingIgnoreCaseOrOriginalTitleContainingIgnoreCase(search, search);
        } else if (type != null && !type.isBlank() && !type.equalsIgnoreCase("all")) {
            movies = movieRepository.findAllByTypeAndStatus(type, "PUBLISHED");
            if (movies.isEmpty()) {
                movies = movieRepository.findAllByType(type);
            }
        } else {
            movies = movieRepository.findAllByStatus("PUBLISHED");
            if (movies.isEmpty()) {
                movies = movieRepository.findAll();
            }
        }

        return ResponseEntity.ok(ResponseModel.success(movies, "Lấy danh sách phim thành công!"));
    }

    /**
     * API Lấy danh sách toàn bộ các thể loại phim khả dụng
     */
    @GetMapping("/movies/genres")
    public ResponseEntity<ResponseModel<List<String>>> getAvailableGenres() {
        Set<String> allGenres = new LinkedHashSet<>(List.of(
                "Hành Động", "Khoa Học Viễn Tưởng", "Tâm Lý", "Kinh Dị",
                "Hoạt Hình", "Hài Hước", "Lãng Mạn", "Phiêu Lưu",
                "Bí Ẩn", "Chiến Tranh", "Lịch Sử", "Gia Đình",
                "Giả Tưởng", "Võ Thuật", "Tài Liệu", "Âm Nhạc"
        ));
        List<MovieEntity> movies = movieRepository.findAll();
        for (MovieEntity m : movies) {
            if (m.getGenres() != null) {
                allGenres.addAll(m.getGenres());
            }
        }
        return ResponseEntity.ok(ResponseModel.success(new ArrayList<>(allGenres), "Lấy danh sách thể loại thành công!"));
    }

    @GetMapping("/movies/{idOrSlug}")
    public ResponseEntity<ResponseModel<Map<String, Object>>> getMovieDetail(@PathVariable String idOrSlug) {
        MovieEntity movie = movieRepository.findById(idOrSlug)
                .or(() -> movieRepository.findBySlug(idOrSlug))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim với ID hoặc Slug: " + idOrSlug));

        List<EpisodeEntity> episodes = episodeRepository.findAllByMovieIdOrderBySeasonNumberAscEpisodeNumberAsc(movie.getId());

        Map<String, Object> data = new HashMap<>();
        data.put("movie", movie);
        data.put("episodes", episodes);

        return ResponseEntity.ok(ResponseModel.success(data, "Lấy thông tin chi tiết phim thành công!"));
    }

    /**
     * API Tăng lượt xem phim khi người dùng xem video (Default = 0, tăng 1 mỗi lượt xem)
     */
    @PostMapping("/movies/{idOrSlug}/view")
    public ResponseEntity<ResponseModel<Map<String, Object>>> incrementMovieViews(@PathVariable String idOrSlug) {
        MovieEntity movie = movieRepository.findById(idOrSlug)
                .or(() -> movieRepository.findBySlug(idOrSlug))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim với ID hoặc Slug: " + idOrSlug));

        movie.setViews(movie.getViews() + 1);
        movie.setUpdatedAt(Instant.now());
        movieRepository.save(movie);

        Map<String, Object> resData = new HashMap<>();
        resData.put("id", movie.getId());
        resData.put("views", movie.getViews());
        return ResponseEntity.ok(ResponseModel.success(resData, "Ghi nhận 1 lượt xem thành công!"));
    }

    /**
     * API Lấy danh sách tập phim theo Movie ID
     */
    @GetMapping("/episodes/movie/{movieId}")
    public ResponseEntity<ResponseModel<List<EpisodeEntity>>> getEpisodesByMovie(@PathVariable String movieId) {
        List<EpisodeEntity> episodes = episodeRepository.findAllByMovieIdOrderBySeasonNumberAscEpisodeNumberAsc(movieId);
        return ResponseEntity.ok(ResponseModel.success(episodes, "Lấy danh sách tập phim thành công!"));
    }

    // ==========================================================
    // Admin CMS Endpoints (TASK-058, TASK-059, TASK-060)
    // ==========================================================

    /**
     * TASK-058: Quản trị viên lấy danh sách toàn bộ phim (DRAFT & PUBLISHED)
     */
    @GetMapping("/admin/movies")
    public ResponseEntity<ResponseModel<List<MovieEntity>>> getAdminMovies() {
        List<MovieEntity> movies = movieRepository.findAll();
        return ResponseEntity.ok(ResponseModel.success(movies, "Lấy danh sách phim quản trị thành công!"));
    }

    /**
     * TASK-058: Tạo phim mới
     */
    @PostMapping("/admin/movies")
    public ResponseEntity<ResponseModel<MovieEntity>> createMovie(@RequestBody MovieEntity movie) {
        if (movie.getSlug() == null || movie.getSlug().isBlank()) {
            movie.setSlug(movie.getTitle().toLowerCase().replaceAll("[^a-z0-9]+", "-"));
        }
        movie.setCreatedAt(Instant.now());
        movie.setUpdatedAt(Instant.now());
        if (movie.getStatus() == null) {
            movie.setStatus("DRAFT");
        }
        MovieEntity saved = movieRepository.save(movie);
        return ResponseEntity.ok(ResponseModel.success(saved, "Tạo bản ghi phim thành công!"));
    }

    /**
     * TASK-058: Cập nhật thông tin phim
     */
    @PutMapping("/admin/movies/{id}")
    public ResponseEntity<ResponseModel<MovieEntity>> updateMovie(
            @PathVariable String id,
            @RequestBody MovieEntity updated) {

        MovieEntity movie = movieRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim với ID: " + id));

        movie.setTitle(updated.getTitle());
        movie.setOriginalTitle(updated.getOriginalTitle());
        movie.setSynopsis(updated.getSynopsis());
        movie.setPoster(updated.getPoster());
        movie.setBackdrop(updated.getBackdrop());
        movie.setGenres(updated.getGenres());
        movie.setImdbRating(updated.getImdbRating());
        movie.setReleaseYear(updated.getReleaseYear());
        movie.setAgeRating(updated.getAgeRating());
        movie.setDirector(updated.getDirector());
        movie.setCast(updated.getCast());
        movie.setType(updated.getType());
        movie.setQualityBadge(updated.getQualityBadge());
        movie.setAudioBadge(updated.getAudioBadge());
        movie.setUpdatedAt(Instant.now());

        MovieEntity saved = movieRepository.save(movie);
        return ResponseEntity.ok(ResponseModel.success(saved, "Cập nhật metadata phim thành công!"));
    }

    /**
     * TASK-058: Xóa phim & các tập liên quan & thư mục file video
     */
    @DeleteMapping("/admin/movies/{id}")
    public ResponseEntity<ResponseModel<String>> deleteMovie(@PathVariable String id) {
        MovieEntity movie = movieRepository.findById(id)
                .or(() -> movieRepository.findBySlug(id))
                .orElse(null);

        String realId = movie != null ? movie.getId() : id;
        movieRepository.deleteById(realId);
        episodeRepository.deleteAllByMovieId(realId);
        if (!realId.equals(id)) {
            episodeRepository.deleteAllByMovieId(id);
        }

        // Dọn dẹp thư mục video trên ổ đĩa nếu có
        try {
            File movieDir = new File(videoDirPath, realId);
            if (movieDir.exists()) {
                deleteDirectoryRecursively(movieDir);
            }
        } catch (Exception e) {
            logger.warn("Không thể xóa thư mục video {}: {}", realId, e.getMessage());
        }

        return ResponseEntity.ok(ResponseModel.success(id, "Đã xóa phim cùng toàn bộ tập và dữ liệu liên quan thành công!"));
    }

    /**
     * API Dọn dẹp toàn bộ phim Demo mẫu (Dune, Gia Tộc Rồng, Ký Sinh Trùng, Hố Đen Tử Thần)
     */
    @DeleteMapping("/admin/movies/cleanup/demo")
    public ResponseEntity<ResponseModel<Map<String, Object>>> cleanupDemoMovies() {
        List<String> demoSlugsOrIds = List.of(
                "dune-2", "house-of-the-dragon", "parasite", "interstellar",
                "dune-hanh-tinh-cat-phan-2", "gia-toc-rong-mua-2", "ky-sinh-trung", "ho-den-tu-than"
        );
        int deletedCount = 0;
        for (String key : demoSlugsOrIds) {
            Optional<MovieEntity> m = movieRepository.findById(key).or(() -> movieRepository.findBySlug(key));
            if (m.isPresent()) {
                MovieEntity movie = m.get();
                movieRepository.delete(movie);
                episodeRepository.deleteAllByMovieId(movie.getId());
                episodeRepository.deleteAllByMovieId(key);
                try {
                    File movieDir = new File(videoDirPath, movie.getId());
                    if (movieDir.exists()) {
                        deleteDirectoryRecursively(movieDir);
                    }
                } catch (Exception ignored) {}
                deletedCount++;
            }
        }
        logger.info("[Cleanup Demo] Đã dọn dẹp {} phim demo mẫu khỏi Database", deletedCount);
        return ResponseEntity.ok(ResponseModel.success(
                Map.of("deletedCount", deletedCount),
                "Đã dọn dẹp " + deletedCount + " phim demo mẫu khỏi hệ thống thành công!"
        ));
    }

    /**
     * TASK-059: API Thêm tập phim & Gắn kết Video đã Upload
     */
    @PostMapping("/admin/movies/{movieId}/episodes")
    public ResponseEntity<ResponseModel<EpisodeEntity>> addEpisodeToMovie(
            @PathVariable String movieId,
            @RequestBody EpisodeEntity episode) {

        MovieEntity movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim với ID: " + movieId));

        episode.setMovieId(movie.getId());
        episode.setCreatedAt(Instant.now());
        episode.setUpdatedAt(Instant.now());
        if (episode.getProcessStatus() == null) {
            episode.setProcessStatus("PENDING");
        }

        EpisodeEntity saved = episodeRepository.save(episode);
        return ResponseEntity.ok(ResponseModel.success(saved, "Thêm tập phim thành công!"));
    }

    /**
     * Sửa tập phim
     */
    @PutMapping("/admin/episodes/{episodeId}")
    public ResponseEntity<ResponseModel<EpisodeEntity>> updateEpisode(
            @PathVariable String episodeId,
            @RequestBody EpisodeEntity updated) {

        EpisodeEntity ep = episodeRepository.findById(episodeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tập phim: " + episodeId));

        ep.setTitle(updated.getTitle());
        ep.setDuration(updated.getDuration());
        ep.setEpisodeNumber(updated.getEpisodeNumber());
        ep.setSeasonNumber(updated.getSeasonNumber());
        ep.setThumbnail(updated.getThumbnail());
        ep.setSynopsis(updated.getSynopsis());
        ep.setVideoMasterUrl(updated.getVideoMasterUrl());
        ep.setHlsMasterUrl(updated.getHlsMasterUrl());
        ep.setProcessStatus(updated.getProcessStatus());
        ep.setUpdatedAt(Instant.now());

        EpisodeEntity saved = episodeRepository.save(ep);
        return ResponseEntity.ok(ResponseModel.success(saved, "Cập nhật tập phim thành công!"));
    }

    /**
     * Xóa tập phim
     */
    @DeleteMapping("/admin/episodes/{episodeId}")
    public ResponseEntity<ResponseModel<String>> deleteEpisode(@PathVariable String episodeId) {
        episodeRepository.deleteById(episodeId);
        return ResponseEntity.ok(ResponseModel.success(episodeId, "Đã xóa tập phim!"));
    }

    /**
     * TASK-060: API Phê duyệt & Xuất bản Phim ra Trang chủ (Publish Movie API)
     * Tiêu chí nghiệm thu: Phim phải có ít nhất 1 video tập đã transcode COMPLETED mới được chuyển sang PUBLISHED
     */
    @PatchMapping("/admin/movies/{movieId}/publish")
    public ResponseEntity<ResponseModel<MovieEntity>> publishMovie(@PathVariable String movieId) {
        MovieEntity movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim với ID: " + movieId));

        // Kiểm tra điều kiện: có ít nhất 1 tập đã COMPLETED video
        List<EpisodeEntity> completedEpisodes = episodeRepository.findAllByMovieIdAndProcessStatus(movieId, "COMPLETED");

        if (completedEpisodes.isEmpty() && (movie.getStreamUrl() == null || movie.getStreamUrl().isBlank())) {
            // Cho phép publish nếu phim đơn (single) có streamUrl hoặc có tập COMPLETED
            return ResponseEntity.badRequest().body(ResponseModel.error(
                    "Không thể xuất bản phim: Phim chưa có bất kỳ video tập nào được nén HLS hoàn tất (COMPLETED)!"));
        }

        movie.setStatus("PUBLISHED");
        movie.setUpdatedAt(Instant.now());
        MovieEntity saved = movieRepository.save(movie);

        return ResponseEntity.ok(ResponseModel.success(saved,
                "Phê duyệt và xuất bản phim ra trang chủ CineStreams thành công!"));
    }

    private void deleteDirectoryRecursively(File dir) {
        if (dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) {
                    deleteDirectoryRecursively(f);
                }
            }
        }
        dir.delete();
    }
}

