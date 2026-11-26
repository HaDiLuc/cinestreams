package com.vti.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vti.jwt.dto.request.RegisterOtpRequest;
import com.vti.jwt.dto.request.VerifyOtpRequest;
import com.vti.jwt.model.EmailOtp;
import com.vti.jwt.model.MovieEntity;
import com.vti.jwt.model.OtpType;
import com.vti.jwt.repository.EmailOtpRepository;
import com.vti.jwt.repository.MovieRepository;
import com.vti.jwt.repository.UserRepository;
import com.vti.jwt.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CineStreamsFullSuiteTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailOtpRepository emailOtpRepository;

    @Autowired
    private MovieRepository movieRepository;

    @MockBean
    private EmailService emailService;

    private final String testEmail = "cinestreams.test@cinestreams.vn";
    private final String testUsername = "cinestreams_qa";

    @BeforeEach
    void setUp() {
        doNothing().when(emailService).sendOtpEmail(anyString(), anyString(), anyString(), any(OtpType.class), anyInt());
        userRepository.findByEmail(testEmail).ifPresent(userRepository::delete);
        emailOtpRepository.deleteByEmailAndType(testEmail, OtpType.REGISTER);
    }

    @Test
    @DisplayName("[TASK-004 & TASK-005] Đăng ký tài khoản bước 1 & Xác thực OTP bước 2")
    void testRegisterOtpAndVerifyFlow() throws Exception {
        // 1. Đăng ký bước 1
        RegisterOtpRequest req = new RegisterOtpRequest();
        req.setUsername(testUsername);
        req.setEmail(testEmail);
        req.setPassword("SecurePassword123!");
        req.setRoles(Set.of("user"));

        mockMvc.perform(post("/api/auth/register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));

        // 2. Kiểm tra OTP được tạo trong MongoDB
        Optional<EmailOtp> otpOpt = emailOtpRepository
                .findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(testEmail, OtpType.REGISTER);
        assertTrue(otpOpt.isPresent(), "Mã OTP phải được lưu trữ trong MongoDB");
        String otpCode = otpOpt.get().getOtpCode();
        assertEquals(6, otpCode.length(), "Mã OTP phải gồm 6 chữ số");

        // 3. Xác thực OTP bước 2
        VerifyOtpRequest verifyReq = new VerifyOtpRequest(testEmail, otpCode);
        mockMvc.perform(post("/api/auth/verify-register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        // Kiểm tra User đã verified
        assertTrue(userRepository.findByEmail(testEmail).get().isVerified());
    }

    @Test
    @DisplayName("[TASK-008] Chống Spam: Cooldown 60s khi gửi lại mã OTP")
    void testResendOtpCooldown() throws Exception {
        // Gửi lần 1
        RegisterOtpRequest req = new RegisterOtpRequest();
        req.setUsername(testUsername);
        req.setEmail(testEmail);
        req.setPassword("SecurePassword123!");
        mockMvc.perform(post("/api/auth/register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Bấm gửi lại ngay lập tức (chưa qua 60s) -> Bị từ chối
        mockMvc.perform(post("/api/auth/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\", \"type\":\"REGISTER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(0))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Vui lòng đợi")));
    }

    @Test
    @DisplayName("[TASK-019] Khởi tạo phiên upload video dung lượng lớn")
    void testInitVideoUploadSession() throws Exception {
        mockMvc.perform(post("/api/admin/videos/upload/init")
                        .param("fileName", "test_4k_sample.mp4")
                        .param("fileSize", "104857600")
                        .param("totalChunks", "20")
                        .param("chunkSize", "5242880")
                        .param("movieId", "dune-2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.uploadId").isNotEmpty());
    }

    @Test
    @DisplayName("[TASK-050] Dynamic Master Playlist & VIP Quality Gate")
    void testDynamicMasterPlaylistVipGate() throws Exception {
        mockMvc.perform(get("/api/stream/hls/dune-2/master.m3u8"))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    String body = result.getResponse().getContentAsString();
                    assertTrue(body.contains("720p"), "Luồng phát phải chứa chất lượng 720p");
                    assertFalse(body.contains("1080p Full HD"), "Người dùng non-VIP không được xem bản 1080p");
                });
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "quality:publish_gate"})
    @DisplayName("[TASK-058 & TASK-060] Tạo phim và phê duyệt xuất bản ra trang chủ")
    void testMovieCreateAndPublishValidation() throws Exception {
        MovieEntity movie = MovieEntity.builder()
                .title("Dự Án Điện Ảnh Mẫu 2026")
                .slug("du-an-dien-anh-mau-2026")
                .synopsis("Mô tả tóm tắt nội dung phim kiểm thử")
                .type("movie")
                .status("DRAFT")
                .genres(List.of("Hành Động"))
                .releaseYear(2026)
                .build();

        String res = mockMvc.perform(post("/api/admin/movies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(movie)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        MovieEntity created = objectMapper.readTree(res).get("data").traverse(objectMapper).readValueAs(MovieEntity.class);
        assertNotNull(created.getId());

        // Kiểm tra validation xuất bản: Phim chưa có video COMPLETED sẽ bị từ chối xuất bản (TASK-060)
        mockMvc.perform(patch("/api/admin/movies/" + created.getId() + "/publish"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Không thể xuất bản phim")));

        // Dọn dẹp
        movieRepository.deleteById(created.getId());
    }
}

