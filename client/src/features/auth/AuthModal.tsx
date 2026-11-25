import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { OtpSixDigitInput } from './OtpSixDigitInput';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    openAuthModal,
    login,
    registerOtp,
    verifyRegisterOtp,
    forgotPasswordOtp,
    verifyForgotPasswordOtp,
    resetPassword,
    resendOtp,
    pendingEmailForOtp,
    pendingResetToken,
  } = useAuthStore();

  // Form States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Forgot Password Specific States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 60s countdown timer for OTP modals (Register OTP & Forgot Password OTP)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAuthModalOpen && (authModalMode === 'otp' || authModalMode === 'forgot_otp')) {
      setCountdown(60);
      setCanResend(false);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAuthModalOpen, authModalMode]);

  // Keep forgotEmail in sync with pendingEmailForOtp if available
  useEffect(() => {
    if (pendingEmailForOtp && !forgotEmail) {
      setForgotEmail(pendingEmailForOtp);
    }
  }, [pendingEmailForOtp, forgotEmail]);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMessage({ text: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await login(username, password);
    setLoading(false);
    if (!res.success) {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setMessage({ text: 'Vui lòng điền đầy đủ tất cả các trường!', type: 'error' });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: 'Mật khẩu phải từ 6 ký tự trở lên!', type: 'error' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ text: 'Mật khẩu xác nhận không khớp!', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await registerOtp(username, email, password);
    setLoading(false);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleOtpSubmit = async (codeToSubmit = otpCode) => {
    const targetEmail = pendingEmailForOtp || email;
    if (!codeToSubmit.trim() || codeToSubmit.length < 6) {
      setMessage({ text: 'Vui lòng nhập đủ 6 chữ số mã xác minh OTP!', type: 'error' });
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      return;
    }
    setLoading(true);
    setMessage(null);
    setIsError(false);
    const res = await verifyRegisterOtp(targetEmail, codeToSubmit);
    setLoading(false);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setTimeout(() => {
        closeAuthModal();
      }, 1000);
    } else {
      setMessage({ text: res.message, type: 'error' });
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    }
  };

  const handleResend = async () => {
    if (!canResend || loading) return;
    const targetEmail = pendingEmailForOtp || email;
    setLoading(true);
    setMessage(null);
    const res = await resendOtp(targetEmail, 'REGISTER');
    setLoading(false);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setCountdown(60);
      setCanResend(false);
      setOtpCode('');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  // ================= Quên mật khẩu Flows =================
  // Bước 1: Gửi yêu cầu nhập Gmail
  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setMessage({ text: 'Vui lòng nhập tài khoản Gmail/Email của bạn!', type: 'error' });
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail)) {
      setMessage({ text: 'Địa chỉ Gmail/Email không đúng định dạng (vd: user@gmail.com)!', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    const res = await forgotPasswordOtp(cleanEmail);
    setLoading(false);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setForgotOtp('');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  // Bước 2: Xác minh mã OTP 6 số
  const handleVerifyForgotOtp = async (codeToSubmit = forgotOtp) => {
    const targetEmail = pendingEmailForOtp || forgotEmail.trim();
    if (!codeToSubmit.trim() || codeToSubmit.length < 6) {
      setMessage({ text: 'Vui lòng nhập đủ 6 chữ số mã OTP xác minh!', type: 'error' });
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      return;
    }
    setLoading(true);
    setMessage(null);
    setIsError(false);
    const res = await verifyForgotPasswordOtp(targetEmail, codeToSubmit);
    setLoading(false);
    if (res.success) {
      setMessage({ text: 'Xác thực OTP thành công! Mời bạn thiết lập mật khẩu mới.', type: 'success' });
    } else {
      setMessage({ text: res.message, type: 'error' });
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    }
  };

  // Gửi lại mã OTP quên mật khẩu
  const handleResendForgotOtp = async () => {
    if (!canResend || loading) return;
    const targetEmail = pendingEmailForOtp || forgotEmail.trim();
    setLoading(true);
    setMessage(null);
    const res = await resendOtp(targetEmail, 'FORGOT_PWD');
    setLoading(false);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setCountdown(60);
      setCanResend(false);
      setForgotOtp('');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  // Bước 3: Đổi lại mật khẩu mới & xác nhận mật khẩu mới
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = pendingEmailForOtp || forgotEmail.trim();
    if (!newPassword.trim() || newPassword.length < 6) {
      setMessage({ text: 'Mật khẩu mới phải có tối thiểu 6 ký tự!', type: 'error' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ text: 'Mật khẩu xác nhận không trùng khớp!', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    const res = await resetPassword(targetEmail, pendingResetToken, newPassword);
    setLoading(false);
    if (res.success) {
      setMessage({ text: 'Đổi mật khẩu thành công! Mời bạn đăng nhập với mật khẩu mới.', type: 'success' });
      setUsername(targetEmail);
      setPassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-surface-container-low border border-surface-variant/50 shadow-2xl overflow-hidden p-space-md lg:p-space-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-primary/15 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-tertiary-container/15 rounded-full blur-[90px] pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-variant/30 mb-space-md relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">movie_filter</span>
            <span className="font-headline-sm text-lg font-bold bg-gradient-to-r from-primary via-secondary to-primary-container bg-clip-text text-transparent">
              CINESTREAMS
            </span>
          </div>

          <button
            onClick={closeAuthModal}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-outline hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 border relative z-10 ${
              message.type === 'success'
                ? 'bg-primary-container/20 border-primary text-primary'
                : 'bg-error-container/40 border-error text-error'
            }`}
          >
            <span className="material-symbols-outlined text-sm shrink-0">
              {message.type === 'success' ? 'verified' : 'error'}
            </span>
            <span>{message.text}</span>
          </div>
        )}

        {/* ================= MODE 1: LOGIN ================= */}
        {authModalMode === 'login' && (
          <div className="space-y-space-md relative z-10">
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">Chào Mừng Trở Lại</h2>
              <p className="text-xs text-outline mt-1">
                Đăng nhập để xem tiếp trên mọi thiết bị và đồng bộ danh sách yêu thích.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Email hoặc Tên đăng nhập
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    alternate_email
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="hadinhluc_pm hoặc alex@gmail.com"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Mật khẩu</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    key
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-outline hover:text-on-surface text-xs"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Ghi nhớ đăng nhập & Quên mật khẩu */}
              <div className="flex items-center justify-between text-xs text-outline">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-surface-container accent-primary"
                  />
                  <span>Ghi nhớ 30 ngày</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    setForgotEmail(username.includes('@') ? username : '');
                    openAuthModal('forgot_password');
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-base">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-base">login</span>
                )}
                <span>Đăng Nhập Ngay</span>
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-outline">
              Chưa có tài khoản?{' '}
              <button
                onClick={() => {
                  setMessage(null);
                  openAuthModal('register');
                }}
                className="text-primary font-bold hover:underline"
              >
                Đăng ký thành viên
              </button>
            </div>
          </div>
        )}

        {/* ================= MODE 2: REGISTER ================= */}
        {authModalMode === 'register' && (
          <div className="space-y-space-md relative z-10">
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">Đăng Ký Tài Khoản</h2>
              <p className="text-xs text-outline mt-1">
                Trải nghiệm rạp chiếu phim chất lượng cao không giới hạn.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Tên đăng nhập
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    person
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="hadinhluc_pm"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Email</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="luc.hadinh@gmail.com"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Mật khẩu bảo mật
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    key
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Xác nhận lại mật khẩu
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    check_circle
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại chính xác mật khẩu"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-base">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-base">send</span>
                )}
                <span>Đăng Ký & Nhận Mã OTP</span>
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-outline">
              Đã có tài khoản CineStreams?{' '}
              <button
                onClick={() => {
                  setMessage(null);
                  openAuthModal('login');
                }}
                className="text-primary font-bold hover:underline"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        )}

        {/* ================= MODE 3: REGISTER OTP ================= */}
        {authModalMode === 'otp' && (
          <div className="space-y-space-md relative z-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(229,9,20,0.3)]">
              <span className="material-symbols-outlined text-3xl">mark_email_read</span>
            </div>

            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">Xác Thực Mã OTP 6 Số</h2>
              <p className="text-xs text-outline mt-1 leading-relaxed">
                Mã xác minh đã được gửi tới email{' '}
                <strong className="text-primary font-semibold">{pendingEmailForOtp || email}</strong>.
                <br />
                Mã có hiệu lực trong vòng <span className="text-primary font-bold">5 phút</span>.
              </p>
            </div>

            <div className="py-2">
              <OtpSixDigitInput
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  if (message) setMessage(null);
                }}
                onComplete={(val) => handleOtpSubmit(val)}
                isError={isError}
                disabled={loading}
              />
            </div>

            <button
              type="button"
              onClick={() => handleOtpSubmit()}
              disabled={loading || otpCode.length < 6}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-secondary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-base">sync</span>
              ) : (
                <span className="material-symbols-outlined text-base">verified_user</span>
              )}
              <span>Xác Nhận & Kích Hoạt Tài Khoản</span>
            </button>

            <div className="flex items-center justify-between text-xs text-outline pt-2 border-t border-surface-variant/30">
              <button
                onClick={() => openAuthModal('register')}
                className="hover:text-on-surface transition-colors"
              >
                ← Đổi email khác
              </button>

              {canResend ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResend}
                  className="text-primary font-bold hover:underline disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  <span>Gửi lại mã OTP</span>
                </button>
              ) : (
                <span>
                  Gửi lại sau <strong className="font-mono text-primary font-bold">{countdown}s</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ================= MODE 4: QUÊN MẬT KHẨU - NHẬP GMAIL ================= */}
        {authModalMode === 'forgot_password' && (
          <div className="space-y-space-md relative z-10">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/30 flex items-center justify-center mx-auto mb-2 shadow-[0_0_20px_rgba(229,9,20,0.25)]">
                <span className="material-symbols-outlined text-2xl">lock_reset</span>
              </div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">Khôi Phục Mật Khẩu</h2>
              <p className="text-xs text-outline">
                Nhập tài khoản Gmail/Email đã đăng ký. Hệ thống sẽ kiểm tra và gửi mã OTP 6 số về hộp thư của bạn.
              </p>
            </div>

            <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Tài khoản Gmail / Email
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    mail
                  </span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="ví dụ: alex@gmail.com"
                    autoFocus
                    required
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-base">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-base">send</span>
                )}
                <span>Gửi Mã Xác Thực OTP 6 Số</span>
              </button>
            </form>

            <div className="text-center pt-2 border-t border-surface-variant/30">
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  openAuthModal('login');
                }}
                className="text-xs text-outline hover:text-on-surface transition-colors inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Quay lại đăng nhập</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= MODE 5: QUÊN MẬT KHẨU - NHẬP MÃ OTP 6 SỐ ================= */}
        {authModalMode === 'forgot_otp' && (
          <div className="space-y-space-md relative z-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(229,9,20,0.3)]">
              <span className="material-symbols-outlined text-3xl">mark_email_read</span>
            </div>

            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">Xác Thực Mã Đặt Lại</h2>
              <p className="text-xs text-outline mt-1 leading-relaxed">
                Mã xác thực 6 số đã được gửi tới Gmail{' '}
                <strong className="text-primary font-semibold">{pendingEmailForOtp || forgotEmail}</strong>.
                <br />
                Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam). Mã có hiệu lực trong <span className="text-primary font-bold">5 phút</span>.
              </p>
            </div>

            <div className="py-2">
              <OtpSixDigitInput
                value={forgotOtp}
                onChange={(val) => {
                  setForgotOtp(val);
                  if (message) setMessage(null);
                }}
                onComplete={(val) => handleVerifyForgotOtp(val)}
                isError={isError}
                disabled={loading}
              />
            </div>

            <button
              type="button"
              onClick={() => handleVerifyForgotOtp()}
              disabled={loading || forgotOtp.length < 6}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-secondary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-base">sync</span>
              ) : (
                <span className="material-symbols-outlined text-base">check_circle</span>
              )}
              <span>Xác Minh Mã OTP</span>
            </button>

            <div className="flex items-center justify-between text-xs text-outline pt-2 border-t border-surface-variant/30">
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  openAuthModal('forgot_password');
                }}
                className="hover:text-on-surface transition-colors"
              >
                ← Đổi Gmail khác
              </button>

              {canResend ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendForgotOtp}
                  className="text-primary font-bold hover:underline disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  <span>Gửi lại mã OTP</span>
                </button>
              ) : (
                <span>
                  Gửi lại sau <strong className="font-mono text-primary font-bold">{countdown}s</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ================= MODE 6: QUÊN MẬT KHẨU - ĐỔI MẬT KHẨU MỚI & XÁC NHẬN ================= */}
        {authModalMode === 'reset_password' && (
          <div className="space-y-space-md relative z-10">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">Thiết Lập Mật Khẩu Mới</h2>
              <p className="text-xs text-outline">
                Xác thực thành công cho <strong className="text-primary">{pendingEmailForOtp || forgotEmail}</strong>. Vui lòng nhập mật khẩu mới và xác nhận lại mật khẩu.
              </p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    key
                  </span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                    autoFocus
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showNewPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
                    check_circle
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Nhập lại chính xác mật khẩu mới"
                    required
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-base">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-base">lock_reset</span>
                )}
                <span>Lưu & Đặt Lại Mật Khẩu Mới</span>
              </button>
            </form>

            <div className="text-center pt-2 border-t border-surface-variant/30">
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  openAuthModal('login');
                }}
                className="text-xs text-outline hover:text-on-surface transition-colors"
              >
                ← Hủy & quay lại đăng nhập
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
