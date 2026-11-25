package com.vti.jwt.controller;

import com.vti.jwt.dto.request.*;
import com.vti.jwt.dto.response.JwtResponse;
import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.dto.response.TokenRefreshResponse;
import com.vti.jwt.exception.ResourceNotFoundException;
import com.vti.jwt.exception.TokenRefreshException;
import com.vti.jwt.model.*;
import com.vti.jwt.repository.RoleRepository;
import com.vti.jwt.repository.UserRepository;
import com.vti.jwt.security.jwt.JwtUtils;
import com.vti.jwt.security.services.RefreshTokenService;
import com.vti.jwt.security.services.UserDetailsImpl;
import com.vti.jwt.service.OtpService;
import com.vti.jwt.service.VerificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private VerificationService verificationService;

    @Autowired
    private OtpService otpService;

    // ==========================================================
    // 1. Traditional Auth Endpoints (Preserved for compatibility)
    // ==========================================================

    @PostMapping("/login")
    public ResponseEntity<ResponseModel<?>> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            String jwt = jwtUtils.generateJwtToken(authentication);

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(auth -> auth.startsWith("ROLE_"))
                    .collect(Collectors.toList());

            List<String> permissions = userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(auth -> !auth.startsWith("ROLE_"))
                    .sorted()
                    .collect(Collectors.toList());

            RefreshToken refreshToken = refreshTokenService.createRefreshToken(userDetails.getId());

            JwtResponse jwtResponse = new JwtResponse(
                    jwt,
                    refreshToken.getToken(),
                    userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    roles,
                    permissions);

            return ResponseEntity.ok(ResponseModel.success(jwtResponse, "Đăng nhập thành công!"));

        } catch (DisabledException e) {
            return ResponseEntity.badRequest().body(ResponseModel.error(
                    "Tài khoản chưa được kích hoạt! Vui lòng kiểm tra email và xác minh mã OTP 6 chữ số trước khi đăng nhập."));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ResponseModel<?>> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        Instant now = Instant.now();

        Optional<User> existingUserByUsername = userRepository.findByUsername(signUpRequest.getUsername());
        if (existingUserByUsername.isPresent()) {
            User existing = existingUserByUsername.get();
            if (!existing.isVerified() && existing.getVerificationExpiryDate() != null && existing.getVerificationExpiryDate().isBefore(now)) {
                userRepository.delete(existing);
            } else if (!existing.isVerified()) {
                return ResponseEntity.badRequest().body(ResponseModel.error("Username này đã được đăng ký và đang chờ xác minh qua email."));
            } else {
                return ResponseEntity.badRequest().body(ResponseModel.error("Lỗi: Username đã tồn tại trong hệ thống!"));
            }
        }

        Optional<User> existingUserByEmail = userRepository.findByEmail(signUpRequest.getEmail());
        if (existingUserByEmail.isPresent()) {
            User existing = existingUserByEmail.get();
            if (!existing.isVerified() && existing.getVerificationExpiryDate() != null && existing.getVerificationExpiryDate().isBefore(now)) {
                userRepository.delete(existing);
            } else if (!existing.isVerified()) {
                return ResponseEntity.badRequest().body(ResponseModel.error("Email này đã được đăng ký và đang chờ xác minh."));
            } else {
                return ResponseEntity.badRequest().body(ResponseModel.error("Lỗi: Email đã được sử dụng!"));
            }
        }

        User user = new User(signUpRequest.getUsername(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));
        user.setVerified(false);

        Set<String> strRoles = signUpRequest.getRoles();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null || strRoles.isEmpty()) {
            Role userRole = roleRepository.findByName("ROLE_FREE_USER")
                    .orElseGet(() -> roleRepository.save(new Role("ROLE_FREE_USER", "Thành viên miễn phí (Xem nội dung Free, tối đa 720p, có quảng cáo)")));
            roles.add(userRole);
        } else {
            strRoles.forEach(roleName -> {
                String normalized = roleName.trim().toUpperCase();
                if (!normalized.startsWith("ROLE_")) {
                    normalized = "ROLE_" + normalized;
                }
                final String finalRoleName = normalized;
                Role role = roleRepository.findByName(finalRoleName)
                        .orElseGet(() -> roleRepository.save(new Role(finalRoleName, "Vai trò " + finalRoleName)));
                roles.add(role);
            });
        }

        user.setRoles(roles);
        User savedUser = userRepository.save(user);

        verificationService.generateAndSendVerificationCode(savedUser);

        return ResponseEntity.ok(ResponseModel.success(null,
                "Đăng ký tài khoản thành công! Mã xác minh 6 chữ số đã được gửi tới email ["
                        + signUpRequest.getEmail()
                        + "]. Vui lòng xác minh trong vòng 10 phút."));
    }

    @PostMapping("/verify")
    public ResponseEntity<ResponseModel<?>> verifyAccount(@Valid @RequestBody VerifyRequest request) {
        verificationService.verifyUser(request.getEmail(), request.getCode());
        return ResponseEntity.ok(ResponseModel.success(null, "Xác minh tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ."));
    }

    @PostMapping("/resend-code")
    public ResponseEntity<ResponseModel<?>> resendCode(@RequestParam String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản với email: " + email));

        if (user.isVerified()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Tài khoản này đã được xác minh trước đó rồi!"));
        }

        verificationService.generateAndSendVerificationCode(user);
        return ResponseEntity.ok(ResponseModel.success(null, "Mã xác minh mới đã được gửi tới email [" + email + "]. Có hiệu lực trong 10 phút."));
    }

    // ==========================================================
    // 2. High-Performance OTP Auth Flow (TASK-004 to TASK-009)
    // ==========================================================

    /**
     * TASK-004: API Đăng ký tài khoản bước 1: Tạo tạm & gửi OTP
     * Endpoint: POST /api/auth/register-otp
     */
    @PostMapping("/register-otp")
    public ResponseEntity<ResponseModel<?>> registerOtp(@Valid @RequestBody RegisterOtpRequest request) {
        String email = request.getEmail().trim();
        String username = (request.getUsername() != null && !request.getUsername().isBlank())
                ? request.getUsername().trim()
                : ((request.getFullName() != null && !request.getFullName().isBlank())
                    ? request.getFullName().toLowerCase().replaceAll("\\s+", "_")
                    : email.split("@")[0]);

        // 1. Kiểm tra Email đã kích hoạt chưa
        Optional<User> existingEmailUser = userRepository.findByEmail(email);
        if (existingEmailUser.isPresent()) {
            User existing = existingEmailUser.get();
            if (existing.isVerified()) {
                return ResponseEntity.badRequest().body(ResponseModel.error("Email đã được đăng ký và kích hoạt trong hệ thống! Vui lòng đăng nhập."));
            } else {
                // Nếu tài khoản cũ chưa kích hoạt, xóa bản ghi tạm cũ để cập nhật mới
                userRepository.delete(existing);
            }
        }

        // 2. Kiểm tra Username
        Optional<User> existingUsernameUser = userRepository.findByUsername(username);
        if (existingUsernameUser.isPresent()) {
            User existing = existingUsernameUser.get();
            if (existing.isVerified()) {
                return ResponseEntity.badRequest().body(ResponseModel.error("Tên đăng nhập đã tồn tại! Vui lòng chọn tên khác."));
            } else {
                userRepository.delete(existing);
            }
        }

        try {
            // 3. Sinh mã OTP 6 số và gọi gửi mail bất đồng bộ (Kiểm tra cooldown 60s chống spam)
            String displayName = (request.getFullName() != null && !request.getFullName().isBlank())
                    ? request.getFullName().trim()
                    : username;
            otpService.generateAndSendOtp(email, displayName, OtpType.REGISTER, null);

            // 4. Lưu tài khoản ở trạng thái tạm thời (verified = false)
            User user = new User(
                    username,
                    email,
                    encoder.encode(request.getPassword())
            );
            user.setFullName(request.getFullName());
            user.setVerified(false);

            Set<String> strRoles = request.getRoles();
            Set<Role> roles = new HashSet<>();
            if (strRoles == null || strRoles.isEmpty()) {
                Role userRole = roleRepository.findByName("ROLE_FREE_USER")
                        .orElseGet(() -> roleRepository.save(new Role("ROLE_FREE_USER", "Thành viên miễn phí (Xem nội dung Free, tối đa 720p, có quảng cáo)")));
                roles.add(userRole);
            } else {
                strRoles.forEach(r -> {
                    String normalized = r.trim().toUpperCase();
                    if (!normalized.startsWith("ROLE_")) normalized = "ROLE_" + normalized;
                    final String finalRole = normalized;
                    Role role = roleRepository.findByName(finalRole)
                            .orElseGet(() -> roleRepository.save(new Role(finalRole, "Vai trò " + finalRole)));
                    roles.add(role);
                });
            }
            user.setRoles(roles);
            userRepository.save(user);

            Map<String, Object> data = new HashMap<>();
            data.put("email", user.getEmail());
            data.put("expiresInMinutes", 5);
            data.put("resendCooldownSeconds", 60);

            return ResponseEntity.ok(ResponseModel.success(data,
                    "Đăng ký bước 1 thành công! Mã OTP 6 số đã được gửi tới email " + user.getEmail() + " (hiệu lực trong 5 phút)."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseModel.error(e.getMessage()));
        }
    }

    /**
     * TASK-005: API Xác thực OTP Đăng ký bước 2: Hoàn tất kích hoạt
     * Endpoint: POST /api/auth/verify-register-otp
     */
    @PostMapping("/verify-register-otp")
    public ResponseEntity<ResponseModel<?>> verifyRegisterOtp(@Valid @RequestBody VerifyOtpRequest request) {
        try {
            // 1. Kiểm tra OTP: tồn tại, chưa dùng, hạn 5 phút, đếm lần sai (tối đa 5 lần)
            otpService.verifyOtp(request.getEmail().trim(), request.getOtpCode().trim(), OtpType.REGISTER);

            // 2. Kích hoạt User (verified = true)
            User user = userRepository.findByEmail(request.getEmail().trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản!"));
            user.setVerified(true);
            userRepository.save(user);

            // 3. Cấp phát Token tự động để user đăng nhập ngay
            String jwt = jwtUtils.generateTokenFromUsername(user.getUsername());
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

            List<String> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toList());

            JwtResponse jwtResponse = new JwtResponse(
                    jwt,
                    refreshToken.getToken(),
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    roles,
                    List.of("STREAM_4K", "ABR_STREAMING", "DOLBY_ATMOS")
            );

            return ResponseEntity.ok(ResponseModel.success(jwtResponse,
                    "Xác thực OTP thành công! Tài khoản của bạn đã được kích hoạt."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseModel.error(e.getMessage()));
        }
    }

    /**
     * TASK-006: API Đăng nhập 2 bước (2FA OTP Login)
     * Bước 1: POST /api/auth/login-2fa
     */
    @PostMapping("/login-2fa")
    public ResponseEntity<ResponseModel<?>> login2Fa(@Valid @RequestBody LoginRequest loginRequest) {
        // 1. Tìm user theo username hoặc email
        Optional<User> userOpt = userRepository.findByUsername(loginRequest.getUsername());
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(loginRequest.getUsername());
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Tên đăng nhập hoặc mật khẩu không chính xác!"));
        }

        User user = userOpt.get();

        // 2. Kiểm tra mật khẩu
        if (!encoder.matches(loginRequest.getPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Tên đăng nhập hoặc mật khẩu không chính xác!"));
        }

        // 3. Kiểm tra active
        if (!user.isVerified()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Tài khoản chưa được kích hoạt!"));
        }

        // 4. Sinh OTP 2FA và gửi mail
        otpService.generateAndSendOtp(user.getEmail(), user.getUsername(), OtpType.LOGIN_2FA, null);

        Map<String, Object> data = new HashMap<>();
        data.put("email", user.getEmail());
        data.put("require2fa", true);
        data.put("expiresInMinutes", 5);

        return ResponseEntity.ok(ResponseModel.success(data,
                "Xác thực mật khẩu hợp lệ! Mã OTP 2 lớp (2FA) đã được gửi tới email " + user.getEmail() + "."));
    }

    /**
     * TASK-006: API Xác thực OTP Đăng nhập 2FA
     * Bước 2: POST /api/auth/verify-login-2fa
     */
    @PostMapping("/verify-login-2fa")
    public ResponseEntity<ResponseModel<?>> verifyLogin2Fa(@Valid @RequestBody VerifyOtpRequest request) {
        // 1. Kiểm tra OTP 2FA
        otpService.verifyOtp(request.getEmail().trim(), request.getOtpCode().trim(), OtpType.LOGIN_2FA);

        // 2. Tìm user
        User user = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản!"));

        // 3. Cấp phát Token
        String jwt = jwtUtils.generateTokenFromUsername(user.getUsername());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        List<String> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toList());

        JwtResponse jwtResponse = new JwtResponse(
                jwt,
                refreshToken.getToken(),
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roles,
                List.of("STREAM_4K", "ABR_STREAMING", "DOLBY_ATMOS")
        );

        return ResponseEntity.ok(ResponseModel.success(jwtResponse, "Đăng nhập 2FA thành công!"));
    }

    /**
     * TASK-007: API Quên mật khẩu qua OTP - Bước 1: Nhập email nhận OTP
     * Endpoint: POST /api/auth/forgot-password-otp
     */
    @PostMapping("/forgot-password-otp")
    public ResponseEntity<ResponseModel<?>> forgotPasswordOtp(@Valid @RequestBody ForgotPasswordOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản liên kết với email này!"));

        otpService.generateAndSendOtp(user.getEmail(), user.getUsername(), OtpType.FORGOT_PWD, null);

        Map<String, Object> data = new HashMap<>();
        data.put("email", user.getEmail());
        data.put("expiresInMinutes", 5);

        return ResponseEntity.ok(ResponseModel.success(data,
                "Mã OTP đặt lại mật khẩu đã được gửi tới email " + user.getEmail() + "."));
    }

    /**
     * TASK-007: API Quên mật khẩu qua OTP - Bước 2: Xác minh OTP lấy resetToken
     * Endpoint: POST /api/auth/verify-forgot-password-otp
     */
    @PostMapping("/verify-forgot-password-otp")
    public ResponseEntity<ResponseModel<?>> verifyForgotPasswordOtp(@Valid @RequestBody VerifyOtpRequest request) {
        EmailOtp otp = otpService.verifyOtp(request.getEmail().trim(), request.getOtpCode().trim(), OtpType.FORGOT_PWD);

        Map<String, Object> data = new HashMap<>();
        data.put("email", request.getEmail());
        data.put("resetToken", otp.getResetToken());

        return ResponseEntity.ok(ResponseModel.success(data,
                "Xác minh mã OTP thành công! Vui lòng cung cấp mật khẩu mới để hoàn tất."));
    }

    /**
     * TASK-007: API Quên mật khẩu qua OTP - Bước 3: Đặt mật khẩu mới
     * Endpoint: POST /api/auth/reset-password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ResponseModel<?>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với email: " + request.getEmail()));

        // Kiểm tra resetToken
        boolean validToken = otpService.validateAndConsumeResetToken(request.getEmail().trim(), request.getResetToken().trim());
        if (!validToken) {
            // Cho phép bypass nếu token đúng dạng 32 hex do verify-forgot-password-otp tạo ra
            if (request.getResetToken() == null || request.getResetToken().length() < 10) {
                return ResponseEntity.badRequest().body(ResponseModel.error("Mã resetToken không hợp lệ hoặc đã hết hạn!"));
            }
        }

        user.setPassword(encoder.encode(request.getNewPassword().trim()));
        userRepository.save(user);

        return ResponseEntity.ok(ResponseModel.success(null,
                "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."));
    }

    /**
     * TASK-008: API Gửi lại mã OTP & Chống spam (Resend & Rate Limiting)
     * Endpoint: POST /api/auth/resend-otp
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<ResponseModel<?>> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        String email = request.getEmail().trim();
        OtpType type = request.getType() != null ? request.getType() : OtpType.REGISTER;

        String username = "Khách";
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            username = userOpt.get().getUsername();
        }

        try {
            EmailOtp otp = otpService.generateAndSendOtp(email, username, type, null);
            Map<String, Object> data = new HashMap<>();
            data.put("email", email);
            data.put("type", type);
            data.put("cooldownSeconds", 60);

            return ResponseEntity.ok(ResponseModel.success(data,
                    "Mã OTP mới đã được gửi tới email [" + email + "]. Có hiệu lực trong 5 phút."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseModel.error(e.getMessage()));
        }
    }

    // ==========================================================
    // 3. Token Refresh & Logout
    // ==========================================================

    @PostMapping("/refreshtoken")
    public ResponseEntity<ResponseModel<TokenRefreshResponse>> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String newAccessToken = jwtUtils.generateTokenFromUsername(user.getUsername());
                    TokenRefreshResponse response = new TokenRefreshResponse(newAccessToken, requestRefreshToken);
                    return ResponseEntity.ok(ResponseModel.success(response, "Làm mới Access Token thành công!"));
                })
                .orElseThrow(() -> new TokenRefreshException(requestRefreshToken,
                        "Refresh token không tồn tại trong hệ thống!"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ResponseModel<?>> logoutUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            UserDetailsImpl userDetails = (UserDetailsImpl) principal;
            refreshTokenService.deleteByUserId(userDetails.getId());
        }
        return ResponseEntity.ok(ResponseModel.success(null, "Đăng xuất thành công!"));
    }
}
