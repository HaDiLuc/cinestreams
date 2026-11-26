import { apiClient, ApiResponse } from './apiClient';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  roles?: string[];
}

export interface VerifyPayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  resetToken: string;
  newPassword: string;
}

export interface AuthSuccessData {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  id?: string;
  username: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  vipTier?: string;
  avatar?: string;
}

export interface RegisterSuccessData {
  username?: string;
  email?: string;
  demoCode?: string;
  expiresInMinutes?: number;
}

export const authService = {
  /**
   * Đăng nhập thông thường (Nhận JWT Token)
   */
  async login(payload: LoginPayload): Promise<ApiResponse<AuthSuccessData>> {
    return apiClient.post<AuthSuccessData>('/auth/login', payload);
  },

  /**
   * TASK-006: Đăng nhập 2 bước (2FA) - Bước 1: Gửi OTP về mail
   */
  async login2Fa(payload: LoginPayload): Promise<ApiResponse<{ email: string; require2fa: boolean }>> {
    return apiClient.post<{ email: string; require2fa: boolean }>('/auth/login-2fa', payload);
  },

  /**
   * TASK-006: Đăng nhập 2 bước (2FA) - Bước 2: Xác thực mã OTP để nhận Token
   */
  async verifyLogin2Fa(email: string, otpCode: string): Promise<ApiResponse<AuthSuccessData>> {
    return apiClient.post<AuthSuccessData>('/auth/verify-login-2fa', { email, otpCode });
  },

  /**
   * TASK-004: Đăng ký tài khoản bước 1: Tạo tạm & nhận OTP 6 số
   */
  async registerOtp(payload: RegisterPayload): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/auth/register-otp', {
      username: payload.username.trim(),
      email: payload.email.trim(),
      password: payload.password,
      roles: payload.roles || ['user'],
    });
  },

  /**
   * TASK-005: Xác thực OTP Đăng ký bước 2: Hoàn tất kích hoạt và cấp token
   */
  async verifyRegisterOtp(email: string, otpCode: string): Promise<ApiResponse<AuthSuccessData>> {
    return apiClient.post<AuthSuccessData>('/auth/verify-register-otp', {
      email: email.trim(),
      otpCode: otpCode.trim(),
    });
  },

  /**
   * Đăng ký tài khoản (tương thích cũ)
   */
  async register(payload: RegisterPayload): Promise<ApiResponse<RegisterSuccessData>> {
    return apiClient.post<RegisterSuccessData>('/auth/register', {
      username: payload.username.trim(),
      email: payload.email.trim(),
      password: payload.password,
      roles: payload.roles || ['user'],
    });
  },

  /**
   * Xác minh tài khoản bằng mã OTP (tương thích cũ)
   */
  async verifyOtp(payload: VerifyPayload): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/auth/verify', {
      email: payload.email.trim(),
      code: payload.code.trim(),
    });
  },

  /**
   * TASK-007: Quên mật khẩu - Bước 1: Gửi mã OTP qua email
   */
  async forgotPasswordOtp(email: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/auth/forgot-password-otp', { email: email.trim() });
  },

  /**
   * TASK-007: Quên mật khẩu - Bước 2: Xác minh OTP lấy resetToken
   */
  async verifyForgotPasswordOtp(email: string, otpCode: string): Promise<ApiResponse<{ resetToken: string }>> {
    return apiClient.post<{ resetToken: string }>('/auth/verify-forgot-password-otp', {
      email: email.trim(),
      otpCode: otpCode.trim(),
    });
  },

  /**
   * TASK-007: Quên mật khẩu - Bước 3: Đặt lại mật khẩu mới
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/auth/reset-password', payload);
  },

  /**
   * TASK-008: Gửi lại mã OTP (hỗ trợ chống spam & cooldown 60s)
   */
  async resendOtp(email: string, type: 'REGISTER' | 'LOGIN_2FA' | 'FORGOT_PWD' = 'REGISTER'): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/auth/resend-otp', { email: email.trim(), type });
  },

  /**
   * Gửi lại mã xác minh cũ (fallback)
   */
  async resendOtpLegacy(email: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/auth/resend-code?email=${encodeURIComponent(email.trim())}`);
  },

  /**
   * Cấp mới Access Token bằng Refresh Token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/auth/refreshtoken', { refreshToken });
  },

  /**
   * Đăng xuất khỏi hệ thống
   */
  async logout(): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/auth/logout');
  },
};

export default authService;
