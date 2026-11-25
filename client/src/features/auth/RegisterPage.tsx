import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { OtpSixDigitInput } from './OtpSixDigitInput';

export const RegisterPage: React.FC = () => {
  const { registerOtp, verifyRegisterOtp, resendOtp } = useAuthStore();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  // 60s countdown for resend button (TASK-012)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp') {
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
  }, [step]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setMessage({ text: 'Vui lòng điền đầy đủ tất cả thông tin!', type: 'error' });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: 'Mật khẩu phải có tối thiểu 6 ký tự!', type: 'error' });
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
      setStep('otp');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleVerify = async (codeToSubmit = otpCode) => {
    if (!codeToSubmit.trim() || codeToSubmit.length < 6) {
      setMessage({ text: 'Vui lòng nhập đủ 6 chữ số mã OTP!', type: 'error' });
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      return;
    }
    setLoading(true);
    setMessage(null);
    setIsError(false);

    const res = await verifyRegisterOtp(email, codeToSubmit);
    setLoading(false);
    if (res.success) {
      setMessage({ text: 'Kích hoạt thành công! Đang chuyển hướng vào nền tảng...', type: 'success' });
      setTimeout(() => navigate('/ho-so'), 1000);
    } else {
      setMessage({ text: res.message, type: 'error' });
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    }
  };

  const handleResend = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setMessage(null);
    const res = await resendOtp(email, 'REGISTER');
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

  return (
    <div className="w-full min-h-[85vh] flex items-center justify-center p-4 relative overflow-hidden">
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
            {step === 'form' ? 'Tạo Tài Khoản Xem Phim 4K' : 'Xác Thực Mã OTP 6 Số'}
          </h1>
          <p className="text-xs text-outline">
            {step === 'form'
              ? 'Tận hưởng kho phim bản quyền chiếu rạp chuẩn IMAX & Dolby Atmos'
              : `Mã bảo mật đã được gửi tới ${email}. Mã có hiệu lực trong 5 phút.`}
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs leading-relaxed flex items-center gap-2 border ${
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

        {step === 'form' ? (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Tên tài khoản (Username)
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="vd: hadinhluc_pm"
                  className="w-full h-11 pl-11 pr-4 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Địa chỉ Email nhận mã OTP
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="luc.hadinh@cinestreams.vn"
                  className="w-full h-11 pl-11 pr-4 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">Mật khẩu</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  key
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full h-11 pl-11 pr-4 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">
                Xác nhận lại mật khẩu
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-lg">
                  check_circle
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại chính xác mật khẩu"
                  className="w-full h-11 pl-11 pr-4 rounded-xl bg-surface-container text-on-surface text-sm outline-none border border-surface-variant/40 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
              ) : (
                <span className="material-symbols-outlined text-lg">mark_email_read</span>
              )}
              <span>Đăng Ký & Nhận Mã OTP 6 Số</span>
            </button>
          </form>
        ) : (
          <div className="space-y-5 text-center">
            {/* TASK-011: 6 ô input rời rạc & Auto-focus, paste clipboard, shake on error */}
            <div className="py-2">
              <OtpSixDigitInput
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  if (message) setMessage(null);
                }}
                onComplete={(val) => handleVerify(val)}
                isError={isError}
                disabled={loading}
              />
            </div>

            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={loading || otpCode.length < 6}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
              ) : (
                <span className="material-symbols-outlined text-lg">verified_user</span>
              )}
              <span>Xác Minh & Kích Hoạt Tài Khoản</span>
            </button>

            {/* TASK-012: Countdown Timer 60s & Resend button */}
            <div className="flex items-center justify-between text-xs text-outline pt-2 border-t border-surface-variant/30">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="hover:text-on-surface flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">arrow_back</span>
                <span>Nhập lại thông tin</span>
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
                <span className="text-outline">
                  Gửi lại sau <strong className="font-mono text-primary font-bold">{countdown}s</strong>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="text-center pt-2 text-xs text-outline">
          Đã có tài khoản?{' '}
          <Link to="/dang-nhap" className="text-primary font-bold hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
