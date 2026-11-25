import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { OtpSixDigitInput } from './OtpSixDigitInput';

type LoginView = 'login' | '2fa' | 'forgot_email' | 'forgot_otp' | 'forgot_reset';

export const LoginPage: React.FC = () => {
  const {
    login,
    login2Fa,
    verifyLogin2Fa,
    forgotPasswordOtp,
    verifyForgotPasswordOtp,
    resetPassword,
    resendOtp,
  } = useAuthStore();

  const [view, setView] = useState<LoginView>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [use2FA, setUse2FA] = useState(false);

  // OTP State
  const [targetEmail, setTargetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isOtpShake, setIsOtpShake] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigate = useNavigate();

  // 60s countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === '2fa' || view === 'forgot_otp') {
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
  }, [view]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (use2FA) {
      // 2FA Flow
      const res = await login2Fa(username, password);
      setLoading(false);
      if (res.success && res.email) {
        setTargetEmail(res.email);
        setSuccessMsg(res.message);
        setView('2fa');
      } else {
        setError(res.message);
      }
    } else {
      // Standard Direct Login
      const res = await login(username, password);
      setLoading(false);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message);
      }
    }
  };

  // Verify 2FA OTP
  const handleVerify2Fa = async (codeToSubmit = otpCode) => {
    if (codeToSubmit.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số OTP!');
      setIsOtpShake(true);
      setTimeout(() => setIsOtpShake(false), 500);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await verifyLogin2Fa(targetEmail, codeToSubmit);
    setLoading(false);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
      setIsOtpShake(true);
      setTimeout(() => setIsOtpShake(false), 500);
    }
  };

  // Forgot Password - Step 1
  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail) {
      setError('Vui lòng nhập tài khoản Gmail/Email đăng ký tài khoản!');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail)) {
      setError('Địa chỉ Gmail/Email không đúng định dạng (vd: user@gmail.com)!');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await forgotPasswordOtp(cleanEmail);
    setLoading(false);
    if (res.success) {
      setSuccessMsg(res.message);
      setView('forgot_otp');
    } else {
      setError(res.message);
    }
  };

  // Forgot Password - Step 2 (Verify OTP)
  const handleVerifyForgotOtp = async (codeToSubmit = otpCode) => {
    if (codeToSubmit.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số OTP!');
      setIsOtpShake(true);
      setTimeout(() => setIsOtpShake(false), 500);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await verifyForgotPasswordOtp(targetEmail, codeToSubmit);
    setLoading(false);
    if (res.success && res.resetToken) {
      setResetToken(res.resetToken);
      setSuccessMsg('Xác thực OTP thành công! Mời bạn thiết lập mật khẩu mới.');
      setView('forgot_reset');
    } else {
      setError(res.message);
      setIsOtpShake(true);
      setTimeout(() => setIsOtpShake(false), 500);
    }
  };

  // Forgot Password - Step 3 (Reset)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không trùng khớp!');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await resetPassword(targetEmail, resetToken, newPassword);
    setLoading(false);
    if (res.success) {
      setSuccessMsg('Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.');
      setView('login');
      setUsername(targetEmail);
      setPassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setError(res.message);
    }
  };

  // Resend OTP handler
  const handleResend = async (type: 'LOGIN_2FA' | 'FORGOT_PWD') => {
    if (!canResend || loading) return;
    setLoading(true);
    setError(null);
    const res = await resendOtp(targetEmail, type);
    setLoading(false);
    if (res.success) {
      setSuccessMsg(res.message);
      setCountdown(60);
      setCanResend(false);
      setOtpCode('');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="w-full min-h-[85vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cinematic Ambient Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary-container/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-lg rounded-3xl bg-surface-container-low/95 backdrop-blur-2xl border border-surface-variant/40 shadow-2xl p-space-lg md:p-space-xl space-y-space-md">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group mb-2">
            <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">
              movie_filter
            </span>
            <span className="font-headline-sm text-xl font-bold bg-gradient-to-r from-primary via-secondary to-primary-container bg-clip-text text-transparent">
              CINESTREAMS
            </span>
          </Link>
          <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
            {view === 'login' && 'Cổng Đăng Nhập Điện Ảnh'}
            {view === '2fa' && 'Xác Thực 2 Bước (2FA)'}
            {view === 'forgot_email' && 'Quên Mật Khẩu'}
            {view === 'forgot_otp' && 'Xác Thực Mã Đặt Lại'}
            {view === 'forgot_reset' && 'Thiết Lập Mật Khẩu Mới'}
          </h1>
          <p className="text-xs text-outline">
            {view === 'login' && 'Bảo vệ bởi kiến trúc phân quyền RBAC & mã hóa SSL 256-bit'}
            {view === '2fa' && `Mã xác minh đã được gửi tới ${targetEmail}. Hiệu lực 5 phút.`}
            {view === 'forgot_email' && 'Nhập email đã đăng ký để nhận mã OTP khôi phục mật khẩu.'}
            {view === 'forgot_otp' && `Nhập mã 6 số gửi tới ${targetEmail} để xác minh.`}
            {view === 'forgot_reset' && 'Tạo mật khẩu mạnh mới để bảo vệ tài khoản.'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-error/20 border border-error text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-primary/20 border border-primary text-primary text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= VIEW 1: LOGIN FORM ================= */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Email hoặc Tên đăng nhập
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  alternate_email
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="hadinhluc_pm hoặc alex@cinestreams.vn"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">Mật khẩu</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full h-12 pl-11 pr-12 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* TASK-006 & TASK-014: 2FA Toggle & Forgot Password Link */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-outline hover:text-on-surface">
                <input
                  type="checkbox"
                  checked={use2FA}
                  onChange={(e) => setUse2FA(e.target.checked)}
                  className="w-4 h-4 rounded bg-surface-container accent-primary cursor-pointer"
                />
                <span>Đăng nhập 2 bước (2FA OTP)</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setView('forgot_email');
                }}
                className="text-primary hover:underline font-medium"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(229,9,20,0.5)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
              ) : (
                <span className="material-symbols-outlined text-lg">login</span>
              )}
              <span>{use2FA ? 'Tiếp Tục & Gửi OTP 2FA' : 'Đăng Nhập'}</span>
            </button>
          </form>
        )}

        {/* ================= VIEW 2: 2FA OTP STEP ================= */}
        {view === '2fa' && (
          <div className="space-y-5 text-center">
            <div className="py-2">
              <OtpSixDigitInput
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  if (error) setError(null);
                }}
                onComplete={(val) => handleVerify2Fa(val)}
                isError={isOtpShake}
                disabled={loading}
              />
            </div>

            <button
              type="button"
              onClick={() => handleVerify2Fa()}
              disabled={loading || otpCode.length < 6}
              className="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
              ) : (
                <span className="material-symbols-outlined text-lg">verified_user</span>
              )}
              <span>Xác Thực 2FA & Đăng Nhập</span>
            </button>

            <div className="flex items-center justify-between text-xs text-outline pt-2 border-t border-surface-variant/30">
              <button
                type="button"
                onClick={() => setView('login')}
                className="hover:text-on-surface"
              >
                ← Quay lại đăng nhập
              </button>
              {canResend ? (
                <button
                  type="button"
                  onClick={() => handleResend('LOGIN_2FA')}
                  className="text-primary font-bold hover:underline"
                >
                  Gửi lại mã OTP
                </button>
              ) : (
                <span>
                  Gửi lại sau <strong className="font-mono text-primary font-bold">{countdown}s</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 3: FORGOT PASSWORD - EMAIL ================= */}
        {view === 'forgot_email' && (
          <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Tài khoản Gmail / Email
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  mail
                </span>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="ví dụ: alex@gmail.com"
                  autoFocus
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
              ) : (
                <span className="material-symbols-outlined text-lg">send</span>
              )}
              <span>Gửi Mã Xác Nhận OTP</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-xs text-outline hover:text-on-surface"
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          </form>
        )}

        {/* ================= VIEW 4: FORGOT PASSWORD - OTP ================= */}
        {view === 'forgot_otp' && (
          <div className="space-y-5 text-center">
            <div className="py-2">
              <OtpSixDigitInput
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  if (error) setError(null);
                }}
                onComplete={(val) => handleVerifyForgotOtp(val)}
                isError={isOtpShake}
                disabled={loading}
              />
            </div>

            <button
              type="button"
              onClick={() => handleVerifyForgotOtp()}
              disabled={loading || otpCode.length < 6}
              className="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
              ) : (
                <span className="material-symbols-outlined text-lg">check_circle</span>
              )}
              <span>Xác Minh Mã Khôi Phục</span>
            </button>

            <div className="flex items-center justify-between text-xs text-outline pt-2 border-t border-surface-variant/30">
              <button
                type="button"
                onClick={() => setView('forgot_email')}
                className="hover:text-on-surface"
              >
                ← Nhập lại email
              </button>
              {canResend ? (
                <button
                  type="button"
                  onClick={() => handleResend('FORGOT_PWD')}
                  className="text-primary font-bold hover:underline"
                >
                  Gửi lại mã OTP
                </button>
              ) : (
                <span>
                  Gửi lại sau <strong className="font-mono text-primary font-bold">{countdown}s</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 5: FORGOT PASSWORD - RESET ================= */}
        {view === 'forgot_reset' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Mật khẩu mới
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  key
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  autoFocus
                  required
                  className="w-full h-12 pl-11 pr-12 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-lg">
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
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  check_circle
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  className="w-full h-12 pl-11 pr-12 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
              ) : (
                <span className="material-symbols-outlined text-lg">lock_reset</span>
              )}
              <span>Lưu Mật Khẩu Mới</span>
            </button>
          </form>
        )}

        {/* Footer Nav */}
        <div className="text-center pt-2 text-xs text-outline border-t border-surface-variant/30">
          Chưa có tài khoản?{' '}
          <Link to="/dang-ky" className="text-primary font-bold hover:underline">
            Đăng ký tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
};
