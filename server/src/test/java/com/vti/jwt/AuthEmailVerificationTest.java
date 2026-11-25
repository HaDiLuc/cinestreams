package com.vti.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vti.jwt.dto.request.LoginRequest;
import com.vti.jwt.dto.request.SignupRequest;
import com.vti.jwt.dto.request.VerifyRequest;
import com.vti.jwt.model.User;
import com.vti.jwt.model.VerificationCode;
import com.vti.jwt.repository.UserRepository;
import com.vti.jwt.repository.VerificationCodeRepository;
import com.vti.jwt.service.EmailService;
import com.vti.jwt.service.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthEmailVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VerificationCodeRepository verificationCodeRepository;

    @Autowired
    private VerificationService verificationService;

    @MockBean
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        // Mock gửi mail để không cần gửi SMTP thật khi chạy test
        doNothing().when(emailService).sendVerificationEmail(anyString(), anyString(), anyString());

        userRepository.findByUsername("test_user_verify").ifPresent(userRepository::delete);
        verificationCodeRepository.deleteByEmail("test_verify@vti.com.vn");
    }

    @Test
    @DisplayName("1. Đăng ký tài khoản: user được tạo với verified=false và sinh mã OTP 6 số")
    void testRegisterUserGeneratesVerificationCode() throws Exception {
        SignupRequest signupRequest = new SignupRequest("test_user_verify", "test_verify@vti.com.vn", "password123", Set.of("user"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));

        // Kiểm tra User trong MongoDB
        Optional<User> userOpt = userRepository.findByUsername("test_user_verify");
        assertTrue(userOpt.isPresent(), "User phải được lưu trong DB");
        User user = userOpt.get();
        assertFalse(user.isVerified(), "User mới tạo phải ở trạng thái chưa kích hoạt (verified=false)");
        assertNotNull(user.getVerificationExpiryDate(), "User phải có hạn xác minh 10 phút");

        // Kiểm tra VerificationCode 6 chữ số
        Optional<VerificationCode> codeOpt = verificationCodeRepository.findByEmailAndCodeAndVerifiedFalse(
                "test_verify@vti.com.vn",
                verificationCodeRepository.findAll().stream()
                        .filter(c -> "test_verify@vti.com.vn".equals(c.getEmail()))
                        .findFirst().orElseThrow().getCode()
        );
        assertTrue(codeOpt.isPresent(), "Phải tồn tại VerificationCode cho email");
        String otp = codeOpt.get().getCode();
        assertEquals(6, otp.length(), "Mã xác minh phải có đúng 6 chữ số");
        assertTrue(otp.matches("^[0-9]{6}$"), "Mã xác minh phải toàn là số");
    }

    @Test
    @DisplayName("2. Chưa xác minh tài khoản cố gắng đăng nhập -> Bị chặn")
    void testLoginUnverifiedUserFails() throws Exception {
        // Đăng ký trước
        SignupRequest signupRequest = new SignupRequest("test_user_verify", "test_verify@vti.com.vn", "password123", Set.of("user"));
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)));

        // Cố gắng đăng nhập
        LoginRequest loginRequest = new LoginRequest("test_user_verify", "password123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(0))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("chưa được kích hoạt")));
    }

    @Test
    @DisplayName("3. Nhập mã OTP sai -> Báo lỗi không chính xác")
    void testVerifyWithWrongCode() throws Exception {
        SignupRequest signupRequest = new SignupRequest("test_user_verify", "test_verify@vti.com.vn", "password123", Set.of("user"));
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)));

        VerifyRequest verifyRequest = new VerifyRequest("test_verify@vti.com.vn", "000000");
        mockMvc.perform(post("/api/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(0))
                .andExpect(jsonPath("$.message").value("Mã xác minh không chính xác!"));
    }

    @Test
    @DisplayName("4. Nhập mã OTP đúng -> Xác minh thành công & đăng nhập được")
    void testVerifyWithCorrectCodeAndLogin() throws Exception {
        SignupRequest signupRequest = new SignupRequest("test_user_verify", "test_verify@vti.com.vn", "password123", Set.of("user"));
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)));

        // Lấy mã OTP trong DB
        VerificationCode vCode = verificationCodeRepository.findAll().stream()
                .filter(c -> "test_verify@vti.com.vn".equals(c.getEmail()))
                .findFirst().orElseThrow();

        // Xác minh tài khoản
        VerifyRequest verifyRequest = new VerifyRequest("test_verify@vti.com.vn", vCode.getCode());
        mockMvc.perform(post("/api/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));

        // Kiểm tra User đã verified
        User user = userRepository.findByUsername("test_user_verify").orElseThrow();
        assertTrue(user.isVerified(), "User phải chuyển thành verified=true");

        // Đăng nhập sau khi verify -> thành công nhận JWT
        LoginRequest loginRequest = new LoginRequest("test_user_verify", "password123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("5. Quá 10 phút chưa verify -> Tài khoản tạm thời bị xóa khỏi hệ thống")
    void testExpiredUnverifiedUserIsDeleted() throws Exception {
        SignupRequest signupRequest = new SignupRequest("test_user_verify", "test_verify@vti.com.vn", "password123", Set.of("user"));
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)));

        // Giả lập thời gian hết hạn (lùi về 15 phút trước)
        User user = userRepository.findByUsername("test_user_verify").orElseThrow();
        user.setVerificationExpiryDate(Instant.now().minus(15, ChronoUnit.MINUTES));
        userRepository.save(user);

        // Chạy hàm dọn dẹp tài khoản quá hạn
        verificationService.cleanExpiredUnverifiedUsers();

        // Kiểm tra User đã bị xóa khỏi hệ thống
        Optional<User> deletedUser = userRepository.findByUsername("test_user_verify");
        assertTrue(deletedUser.isEmpty(), "Tài khoản quá 10 phút chưa verify phải tự động bị xóa khỏi MongoDB");
    }
}
