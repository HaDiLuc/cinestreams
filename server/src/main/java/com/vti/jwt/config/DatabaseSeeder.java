package com.vti.jwt.config;

import com.vti.jwt.model.*;
import com.vti.jwt.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSeeder.class);

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private EpisodeRepository episodeRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedPermissionsAndRoles();
        seedCategories();
        // Không tự động nạp phim demo mẫu để hệ thống ưu tiên 100% phim thật trong Database
        // seedMoviesAndEpisodes();
    }

    private void seedCategories() {
        List<String> defaultCategories = List.of(
                "Hành Động", "Khoa Học Viễn Tưởng", "Tâm Lý", "Kinh Dị",
                "Hoạt Hình", "Hài Hước", "Lãng Mạn", "Phiêu Lưu",
                "Bí Ẩn", "Chiến Tranh", "Lịch Sử", "Gia Đình",
                "Giả Tưởng", "Võ Thuật", "Tài Liệu", "Âm Nhạc"
        );
        for (String catName : defaultCategories) {
            if (!categoryRepository.existsByName(catName)) {
                categoryRepository.save(new Category(catName, "Thể loại phim " + catName));
            }
        }
        logger.info("Đã khởi tạo danh mục thể loại phim mặc định thành công.");
    }

    private void seedPermissionsAndRoles() {
        Permission pUserRead = getOrCreatePermission("user:read", "Quyền xem thông tin người dùng", "USER");
        Permission pUserCreate = getOrCreatePermission("user:create", "Quyền tạo người dùng mới", "USER");
        Permission pUserUpdate = getOrCreatePermission("user:update", "Quyền cập nhật người dùng", "USER");
        Permission pUserDelete = getOrCreatePermission("user:delete", "Quyền xóa người dùng", "USER");
        Permission pRoleManage = getOrCreatePermission("role:manage", "Quyền quản lý vai trò và phân quyền", "ROLE");
        Permission pMovieManage = getOrCreatePermission("movie:manage", "Quyền quản lý và đăng tải phim", "MOVIE");
        Permission pUploadManage = getOrCreatePermission("upload_manage", "Quyền upload chunking và transcode video", "MOVIE");
        Permission pContentEdit = getOrCreatePermission("content:edit", "Quyền biên tập metadata, poster, banner, mùa và tập", "CONTENT");
        Permission pSubtitleManage = getOrCreatePermission("subtitle:manage", "Quyền tải lên và cấu hình phụ đề WebVTT", "CONTENT");
        Permission pFinanceManage = getOrCreatePermission("finance:manage", "Quyền xem doanh thu, đối soát cổng thanh toán", "FINANCE");
        Permission pRefundProcess = getOrCreatePermission("refund:process", "Quyền xử lý hoàn tiền đơn hàng VIP", "FINANCE");
        Permission pStream4k = getOrCreatePermission("STREAM_4K", "Xem phim phân giải 4K HDR", "STREAMING");
        Permission pDolbyAtmos = getOrCreatePermission("DOLBY_ATMOS", "Âm thanh vòm Dolby Atmos", "STREAMING");
        Permission pWatchPartyHost = getOrCreatePermission("WATCH_PARTY_HOST", "Chủ phòng xem chung WatchParty", "WATCHPARTY");

        Role guestRole = getOrCreateRole("ROLE_GUEST", "Khách vãng lai (Xem trailer, danh mục công khai, xem thử 3 phút)", Set.of(pUserRead));
        Role freeUserRole = getOrCreateRole("ROLE_FREE_USER", "Thành viên miễn phí (Xem nội dung Free, tối đa 720p, có quảng cáo)", Set.of(pUserRead));
        Role vipUserRole = getOrCreateRole("ROLE_VIP_USER", "Thành viên trả phí (Xem độc quyền VIP/Originals, 1080p/4K, không quảng cáo, WatchParty)",
                Set.of(pUserRead, pStream4k, pDolbyAtmos, pWatchPartyHost));
        Role contentEditorRole = getOrCreateRole("ROLE_CONTENT_EDITOR", "Biên tập nội dung (Nhập metadata phim, tải lên poster, banner, WebVTT, tạo season và quản lý tập)",
                Set.of(pUserRead, pMovieManage, pUploadManage, pContentEdit, pSubtitleManage));
        Role financeManagerRole = getOrCreateRole("ROLE_FINANCE_MANAGER", "Quản lý doanh thu (Theo dõi lịch sử giao dịch mua gói, báo cáo doanh số, hoàn tiền, đối soát cổng thanh toán)",
                Set.of(pUserRead, pFinanceManage, pRefundProcess));
        Role adminRole = getOrCreateRole("ROLE_ADMIN", "Quản trị toàn quyền (Quản lý người dùng, phân quyền vai trò, cấu hình hệ thống, xem log kiểm toán)",
                Set.of(pUserRead, pUserCreate, pUserUpdate, pUserDelete, pRoleManage, pMovieManage, pUploadManage, pContentEdit, pSubtitleManage, pFinanceManage, pRefundProcess, pStream4k, pDolbyAtmos, pWatchPartyHost));

        // Tài khoản admin mẫu
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User("admin", "admin@vti.com.vn", passwordEncoder.encode("admin123"));
            admin.setVerified(true);
            admin.setRoles(new HashSet<>(List.of(adminRole, vipUserRole)));
            userRepository.save(admin);
            logger.info("Đã khởi tạo tài khoản admin: admin / admin123");
        }

        // Tài khoản Content Editor mẫu
        if (!userRepository.existsByUsername("editor")) {
            User editor = new User("editor", "editor@cinestreams.vn", passwordEncoder.encode("editor123"));
            editor.setVerified(true);
            editor.setRoles(new HashSet<>(List.of(contentEditorRole, freeUserRole)));
            userRepository.save(editor);
            logger.info("Đã khởi tạo tài khoản Content Editor: editor / editor123");
        }

        // Tài khoản Finance Manager mẫu
        if (!userRepository.existsByUsername("finance")) {
            User finance = new User("finance", "finance@cinestreams.vn", passwordEncoder.encode("finance123"));
            finance.setVerified(true);
            finance.setRoles(new HashSet<>(List.of(financeManagerRole, freeUserRole)));
            userRepository.save(finance);
            logger.info("Đã khởi tạo tài khoản Finance Manager: finance / finance123");
        }

        // Tài khoản VIP User mẫu
        if (!userRepository.existsByUsername("vip_user")) {
            User vip = new User("vip_user", "vip@cinestreams.vn", passwordEncoder.encode("vip123"));
            vip.setVerified(true);
            vip.setRoles(new HashSet<>(List.of(vipUserRole, freeUserRole)));
            userRepository.save(vip);
            logger.info("Đã khởi tạo tài khoản VIP User: vip_user / vip123");
        }

        // Tài khoản Free User mẫu
        if (!userRepository.existsByUsername("free_user")) {
            User free = new User("free_user", "free@cinestreams.vn", passwordEncoder.encode("free123"));
            free.setVerified(true);
            free.setRoles(new HashSet<>(List.of(freeUserRole)));
            userRepository.save(free);
            logger.info("Đã khởi tạo tài khoản Free User: free_user / free123");
        }

        // Tài khoản PM / Lead mẫu (hadinhluc_pm)
        if (!userRepository.existsByUsername("hadinhluc_pm")) {
            User pm = new User("hadinhluc_pm", "luc.hadinh@cinestreams.vn", passwordEncoder.encode("123456"));
            pm.setVerified(true);
            pm.setRoles(new HashSet<>(List.of(adminRole, vipUserRole, freeUserRole)));
            userRepository.save(pm);
            logger.info("Đã khởi tạo tài khoản PM / VIP: hadinhluc_pm / 123456");
        }
    }

    private void seedMoviesAndEpisodes() {
        if (movieRepository.count() > 0) {
            return;
        }

        logger.info("[DatabaseSeeder] Bắt đầu khởi tạo dữ liệu phim và tập phim mẫu vào MongoDB...");

        // 1. Dune: Hành Tinh Cát - Phần 2
        MovieEntity dune = MovieEntity.builder()
                .id("dune-2")
                .slug("dune-2")
                .title("Dune: Hành Tinh Cát - Phần 2")
                .originalTitle("Dune: Part Two")
                .type("movie")
                .status("PUBLISHED")
                .synopsis("Paul Atreides hợp lực cùng Chani và tộc Fremen để tìm kiếm sự báo thù chống lại những kẻ đã hủy hoại gia đình mình, đồng thời đối mặt với số phận vũ trụ.")
                .backdrop("https://lh3.googleusercontent.com/aida-public/AB6AXuCN2LMdr7k6t28pixcqtV_DU65R9YZc6w1Fa_ofgP4IwbnJCRwg4sKZs9nvQ40M0rQPiGuXT_whrQdyb2iltXdCebb-KJylFIFvezB82DegiDGQyGgkTY98eVWk2seEB3-zres6kWJn-SZG_yTH0x0oPrzHFeDIkA6g2zyAlSE5qVt9uHONADDErNAaIEAn92dssTytRm4AFrQAfOeIvPpapO6-EbMVeGb1VJ_UXDyWlKXs68gnjWjb3w")
                .poster("https://lh3.googleusercontent.com/aida-public/AB6AXuC1_0Wc3Q2Yj08kG2K2eG1qW-vQ-78s6gq2s1fC9H1r8g-4g5q-6g7h8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z")
                .imdbRating(8.6)
                .releaseYear(2024)
                .ageRating("16+")
                .badge("TOP 1 THỊNH HÀNH")
                .qualityBadge("4K DOLBY VISION")
                .audioBadge("DOLBY ATMOS")
                .genres(List.of("Khoa Học Viễn Tưởng", "Hành Động", "Phiêu Lưu"))
                .director("Denis Villeneuve")
                .cast(List.of("Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Austin Butler"))
                .streamUrl("/hls/dune-2/hls/master.m3u8")
                .views(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        movieRepository.save(dune);

        // Tập 1 của Dune 2
        EpisodeEntity duneEp1 = EpisodeEntity.builder()
                .id("ep_dune2_01")
                .movieId(dune.getId())
                .seasonNumber(1)
                .episodeNumber(1)
                .title("Bản Chiếu Rạp Hoàn Chỉnh (Full 4K IMAX)")
                .duration("166 phút")
                .durationSeconds(9960)
                .thumbnail(dune.getBackdrop())
                .synopsis("Phiên bản chuẩn rạp IMAX với tỷ lệ khung hình mở rộng 1.90:1 và âm thanh Dolby Atmos 7.1.")
                .videoMasterUrl("/hls/dune-2/hls/master.m3u8")
                .hlsMasterUrl("/hls/dune-2/hls/master.m3u8")
                .processStatus("COMPLETED")
                .build();
        episodeRepository.save(duneEp1);

        // 2. Gia Tộc Rồng Mùa 2
        MovieEntity hotd = MovieEntity.builder()
                .id("house-of-the-dragon")
                .slug("house-of-the-dragon")
                .title("Gia Tộc Rồng (Mùa 2)")
                .originalTitle("House of the Dragon Season 2")
                .type("series")
                .status("PUBLISHED")
                .synopsis("Vũ Điệu Của Bầy Rồng nổ ra khi hai phe Hắc - Lục tranh đoạt Ngai Sắt, dẫn tới cuộc nội chiến khốc liệt nhất lịch sử gia tộc Targaryen.")
                .backdrop("https://lh3.googleusercontent.com/aida-public/AB6AXuDWB0wray9I8h2XDfZBwYxcTQ54563pmKpC0Sqww29xPX0eOgwk130k6MGXOEbP3XTZVJn1nYySI3dQQHcgkz93FwjpwBIvURKsrIbW3DyQgPcAc921IQ6n2uv-jHVEsBpJd-wXRj-i9vU6y8RFs7RLwkQNZWTTzcKBTTunj030sEKYWK9tWx5uy4iGeX8uOVV7ORsKxlhBrav0pa3bIGTE5-u6kipJ_XiDobXyEA_Pq1w8IKnBNRVtMQ")
                .poster("https://lh3.googleusercontent.com/aida-public/AB6AXuDQw8zB3A_44-sample-poster")
                .imdbRating(8.5)
                .releaseYear(2024)
                .ageRating("18+")
                .badge("PHÁT SÓNG TRỰC TIẾP")
                .qualityBadge("4K HDR10+")
                .audioBadge("DOLBY DIGITAL 5.1")
                .genres(List.of("Chính Kịch", "Hành Động", "Kỳ Ảo", "Chiến Tranh"))
                .director("Ryan J. Condal")
                .cast(List.of("Matt Smith", "Emma D'Arcy", "Olivia Cooke", "Ewan Mitchell"))
                .streamUrl("/hls/house-of-the-dragon/hls/master.m3u8")
                .views(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        movieRepository.save(hotd);

        // Các tập phim HOTD
        for (int i = 1; i <= 8; i++) {
            EpisodeEntity ep = EpisodeEntity.builder()
                    .id("ep_hotd_s2_0" + i)
                    .movieId(hotd.getId())
                    .seasonNumber(2)
                    .episodeNumber(i)
                    .title("Tập " + i + ": " + (i == 4 ? "Vũ Điệu Hỏa Long" : "Trận Chiến Cung Đình"))
                    .duration("62 phút")
                    .durationSeconds(3720)
                    .thumbnail(hotd.getBackdrop())
                    .synopsis("Tập " + i + " của đại chiến Vũ Điệu Của Bầy Rồng.")
                    .videoMasterUrl("/hls/house-of-the-dragon/hls/master.m3u8")
                    .hlsMasterUrl("/hls/house-of-the-dragon/hls/master.m3u8")
                    .processStatus("COMPLETED")
                    .build();
            episodeRepository.save(ep);
        }

        // 3. Ký Sinh Trùng
        MovieEntity parasite = MovieEntity.builder()
                .id("parasite")
                .slug("parasite")
                .title("Ký Sinh Trùng (Parasite)")
                .originalTitle("Gisaengchung")
                .type("movie")
                .status("PUBLISHED")
                .synopsis("Gia đình thất nghiệp của Ki-taek dần thâm nhập vào đời sống của gia đình giàu có Park thông qua những lời nói dối tinh vi.")
                .backdrop("https://lh3.googleusercontent.com/aida-public/AB6AXuANB1hgvbgmX1IiaCUXSQXwprdQHl54AHGQyb-k0R-vycd--ICgpPIDcojYzPL92MvVQOPg8N5CfvY8dR9CYvRFxLyrVWj4sYU-Vyt6eWF4o_PK-5L_txH01iM1e7GJ0cjCOyUKwuCJ-4dUp0XzC5PbXfNy3UWAqaj-_tKSKMx50yMZxRyeZK_XJuvCEmJ79JhsU_hMMDNUG2TNug5q_b_0PokRvJCR4hwd-x4r_no4dAORJPy_7X6gKw")
                .imdbRating(8.6)
                .releaseYear(2019)
                .ageRating("18+")
                .badge("OSCAR BEST PICTURE")
                .qualityBadge("4K REMASTER")
                .audioBadge("DOLBY ATMOS")
                .genres(List.of("Tâm Lý", "Giật Gân", "Hài Kịch Đen"))
                .director("Bong Joon-ho")
                .cast(List.of("Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"))
                .streamUrl("/hls/parasite/hls/master.m3u8")
                .views(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        movieRepository.save(parasite);

        EpisodeEntity parasiteEp = EpisodeEntity.builder()
                .id("ep_parasite_01")
                .movieId(parasite.getId())
                .seasonNumber(1)
                .episodeNumber(1)
                .title("Bản Chiếu 4K Remaster Oscar")
                .duration("132 phút")
                .durationSeconds(7920)
                .thumbnail(parasite.getBackdrop())
                .videoMasterUrl("/hls/parasite/hls/master.m3u8")
                .hlsMasterUrl("/hls/parasite/hls/master.m3u8")
                .processStatus("COMPLETED")
                .build();
        episodeRepository.save(parasiteEp);

        // 4. Hố Đen Tử Thần (Interstellar)
        MovieEntity interstellar = MovieEntity.builder()
                .id("interstellar")
                .slug("interstellar")
                .title("Hố Đen Tử Thần (Interstellar)")
                .originalTitle("Interstellar")
                .type("movie")
                .status("PUBLISHED")
                .synopsis("Một nhóm nhà thám hiểm du hành qua hố sâu không gian để tìm kiếm hành tinh mới có thể duy trì sự sống cho nhân loại.")
                .backdrop("https://lh3.googleusercontent.com/aida-public/AB6AXuCnB9UbJQbm94dJuOkoFNoKxx3OSR4SDeJ-prhePQxGn5W77KRfTfBbVDdPloCv7srRBBdTR2YL4SaS46mAj2yK4s1NV_eZWcuh7pplUhpL9F5k3HpFJBmcgWw1s2ZacllfT8jo7OGJ8orxEJYuTQIs58QQWzG7SUL1gLwBZnl_CbWCDcOIeGIpHKuX7SxGcKRjqgoo3LXqu09Lwzxb5-QQWNd0Mw9IGr6sG32ZV3yKPla4x-KiXlM_kg")
                .imdbRating(8.7)
                .releaseYear(2014)
                .ageRating("13+")
                .badge("4K DOLBY ATMOS")
                .qualityBadge("IMAX 4K HDR")
                .audioBadge("DOLBY ATMOS 7.1")
                .genres(List.of("Khoa Học Viễn Tưởng", "Phiêu Lưu", "Chính Kịch"))
                .director("Christopher Nolan")
                .cast(List.of("Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"))
                .streamUrl("/hls/interstellar/hls/master.m3u8")
                .views(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        movieRepository.save(interstellar);

        EpisodeEntity interstellarEp = EpisodeEntity.builder()
                .id("ep_interstellar_01")
                .movieId(interstellar.getId())
                .seasonNumber(1)
                .episodeNumber(1)
                .title("Bản Chiếu IMAX 4K Dolby Atmos")
                .duration("169 phút")
                .durationSeconds(10140)
                .thumbnail(interstellar.getBackdrop())
                .videoMasterUrl("/hls/interstellar/hls/master.m3u8")
                .hlsMasterUrl("/hls/interstellar/hls/master.m3u8")
                .processStatus("COMPLETED")
                .build();
        episodeRepository.save(interstellarEp);

        logger.info("[DatabaseSeeder] Đã khởi tạo thành công {} phim và các tập phim tương ứng vào MongoDB!",
                movieRepository.count());
    }

    private Permission getOrCreatePermission(String name, String description, String module) {
        return permissionRepository.findByName(name).orElseGet(() -> {
            Permission p = new Permission(name, description, module);
            return permissionRepository.save(p);
        });
    }

    private Role getOrCreateRole(String name, String description, Set<Permission> permissions) {
        Role role = roleRepository.findByName(name).orElseGet(() -> new Role(name, description));
        role.setDescription(description);
        role.setPermissions(new HashSet<>(permissions));
        return roleRepository.save(role);
    }
}
