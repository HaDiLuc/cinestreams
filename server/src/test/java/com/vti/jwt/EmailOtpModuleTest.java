package com.vti.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vti.jwt.dto.request.RegisterOtpRequest;
import com.vti.jwt.dto.request.VerifyOtpRequest;
import com.vti.jwt.model.EmailOtp;
import com.vti.jwt.model.OtpType;
import com.vti.jwt.model.User;
import com.vti.jwt.repository.EmailOtpRepository;
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
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class EmailOtpModuleTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailOtpRepository emailOtpRepository;

    @MockBean
    private EmailService emailService;

    private final String testEmail = "cinestreams.otp.test@cinestreams.vn";

    @BeforeEach
    void setUp() {
        doNothing().when(emailService).sendOtpEmail(anyString(), anyString(), anyString(), any(OtpType.class), anyInt());
        userRepository.findByEmail(testEmail).ifPresent(userRepository::delete);
        emailOtpRepository.deleteByEmailAndType(testEmail, OtpType.REGISTER);
    }

    @Test
    @DisplayName("1. Đăng ký bước 1 với RegisterRequest (email, password, fullName) và sinh OTP 6 số")
    void testRegisterOtpFlow() throws Exception {
        RegisterOtpRequest req = RegisterOtpRequest.builder()
                .email(testEmail)
                .password("Password123!")
                .fullName("Nguyễn Khán Giả")
                .build();

        mockMvc.perform(post("/api/auth/register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));

        // Kiểm tra User tạo tạm với verified = false và có fullName
        Optional<User> userOpt = userRepository.findByEmail(testEmail);
        assertTrue(userOpt.isPresent());
        assertFalse(userOpt.get().isVerified());
        assertEquals("Nguyễn Khán Giả", userOpt.get().getFullName());

        // Kiểm tra OTP được tạo
        Optional<EmailOtp> otpOpt = emailOtpRepository
                .findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(testEmail, OtpType.REGISTER);
        assertTrue(otpOpt.isPresent());
        EmailOtp otp = otpOpt.get();
        assertEquals(6, otp.getOtpCode().length());
        assertFalse(otp.isUsed());
        assertEquals(0, otp.getAttempts());
    }

    @Test
    @DisplayName("2. Kiểm tra Rate Limiting (Cooldown 60s khi gửi liên tục)")
    void testRateLimitingCooldown() throws Exception {
        RegisterOtpRequest req = RegisterOtpRequest.builder()
                .email(testEmail)
                .password("Password123!")
                .fullName("Khán Giả Cooldown")
                .build();

        // Gửi lần 1 thành công
        mockMvc.perform(post("/api/auth/register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));

        // Gửi lần 2 ngay lập tức -> Phải bị từ chối với HTTP 400 và thông báo yêu cầu chờ
        mockMvc.perform(post("/api/auth/register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(0))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Vui lòng đợi")));
    }

    @Test
    @DisplayName("3. Xác thực OTP nhập sai tăng attempts, vượt quá 5 lần sẽ khóa mã")
    void testWrongOtpIncrementsAttemptsAndLocks() throws Exception {
        RegisterOtpRequest req = RegisterOtpRequest.builder()
                .email(testEmail)
                .password("Password123!")
                .fullName("Khán Giả BruteForce")
                .build();

        mockMvc.perform(post("/api/auth/register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Nhập sai 4 lần đầu
        for (int i = 1; i <= 4; i++) {
            VerifyOtpRequest wrongReq = new VerifyOtpRequest(testEmail, "000000");
            mockMvc.perform(post("/api/auth/verify-register-otp")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(wrongReq)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(0))
                    .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Mã OTP không chính xác")));
        }

        // Lần thứ 5 nhập sai -> Khóa mã
        VerifyOtpRequest fifthWrongReq = new VerifyOtpRequest(testEmail, "000000");
        mockMvc.perform(post("/api/auth/verify-register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fifthWrongReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(0))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("bị khóa")));

        // Kiểm tra trong DB mã đã bị set isUsed = true và attempts = 5
        Optional<EmailOtp> otpOpt = emailOtpRepository.findAllByEmailOrderByCreatedAtDesc(testEmail).stream().findFirst();
        assertTrue(otpOpt.isPresent());
        assertTrue(otpOpt.get().isUsed());
        assertEquals(5, otpOpt.get().getAttempts());
    }

    @Test
    @DisplayName("4. Xác thực OTP đúng kích hoạt User (verified=true) và trả Token")
    void testSuccessfulOtpVerification() throws Exception {
        RegisterOtpRequest req = RegisterOtpRequest.builder()
                .email(testEmail)
                .password("Password123!")
                .fullName("Khán Giả Thành Công")
                .build();

        mockMvc.perform(post("/api/auth/register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        EmailOtp otp = emailOtpRepository
                .findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(testEmail, OtpType.REGISTER)
                .orElseThrow();

        VerifyOtpRequest verifyReq = new VerifyOtpRequest(testEmail, otp.getOtpCode());
        mockMvc.perform(post("/api/auth/verify-register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        User user = userRepository.findByEmail(testEmail).orElseThrow();
        assertTrue(user.isVerified(), "User phải được chuyển sang trạng thái verified = true");
    }

    @Test
    @DisplayName("5. Gửi lại OTP (resend-otp) sau khi hết cooldown: vô hiệu mã cũ và sinh mã mới")
    void testResendOtpSuccess() throws Exception {
        RegisterOtpRequest req = RegisterOtpRequest.builder()
                .email(testEmail)
                .password("Password123!")
                .fullName("Khán Giả Resend")
                .build();

        mockMvc.perform(post("/api/auth/register-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        EmailOtp oldOtp = emailOtpRepository
                .findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(testEmail, OtpType.REGISTER)
                .orElseThrow();

        // Giả lập thời gian đã trôi qua 61 giây
        oldOtp.setCreatedAt(Instant.now().minus(65, ChronoUnit.SECONDS));
        emailOtpRepository.save(oldOtp);

        // Gọi resend-otp
        mockMvc.perform(post("/api/auth/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + testEmail + "\", \"type\":\"REGISTER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));

        // Kiểm tra mã cũ đã bị hủy (isUsed=true) và có mã mới được sinh ra
        EmailOtp reloadedOld = emailOtpRepository.findById(oldOtp.getId()).orElseThrow();
        assertTrue(reloadedOld.isUsed(), "Mã OTP cũ phải được đánh dấu isUsed = true");

        EmailOtp newOtp = emailOtpRepository
                .findTopByEmailAndTypeAndIsUsedFalseOrderByCreatedAtDesc(testEmail, OtpType.REGISTER)
                .orElseThrow();
        assertNotEquals(oldOtp.getId(), newOtp.getId());
    }
}

