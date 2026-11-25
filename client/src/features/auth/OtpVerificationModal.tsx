import React, { useState, useEffect } from 'react';
import { OtpSixDigitInput } from './OtpSixDigitInput';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  title?: string;
  description?: string;
  onSubmitOtp: (otp: string) => Promise<{ success: boolean; message: string }>;
  onResendOtp: () => Promise<{ success: boolean; message: string }>;
  onSuccess: (data?: any) => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  email,
  title = 'Xác Thực Mã Bảo Mật OTP',
  description,
  onSubmitOtp,
  onResendOtp,
  onSuccess,
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  // 60s countdown timer (TASK-012)
  useEffect(() => {
    if (!isOpen) return;
    setCountdown(60);
    setCanResend(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (codeToSubmit = otpCode) => {
    if (codeToSubmit.length < 6) {
      setErrorMessage('Vui lòng nhập đầy đủ 6 chữ số OTP!');
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setIsError(false);

    const res = await onSubmitOtp(codeToSubmit);
    setLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMessage(res.message);
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setErrorMessage(null);

    const res = await onResendOtp();
    setResending(false);

    if (res.success) {
      setCountdown(60);
      setCanResend(false);
      setOtpCode('');
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-surface-container-low rounded-3xl border border-surface-variant/40 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-outline hover:text-on-surface hover:bg-surface-variant/20 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(229,9,20,0.35)]">
            <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
          </div>
          <h2 className="text-xl font-bold font-headline-sm text-on-surface">{title}</h2>
          <p className="text-xs text-outline leading-relaxed">
            {description || (
              <>
                Mã xác minh 6 số đã được gửi tới{' '}
                <strong className="text-primary font-semibold">{email}</strong>.
                <br />
                Mã có hiệu lực trong vòng <span className="text-primary font-bold">5 phút</span>.
              </>
            )}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-error/15 border border-error/40 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* OTP 6 Box Input (TASK-011) */}
        <div className="py-2">
          <OtpSixDigitInput
            value={otpCode}
            onChange={(val) => {
              setOtpCode(val);
              if (errorMessage) setErrorMessage(null);
            }}
            onComplete={(val) => handleSubmit(val)}
            isError={isError}
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={loading || otpCode.length < 6}
          className="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(229,9,20,0.5)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              <span>Đang kiểm tra mã...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">verified_user</span>
              <span>Xác Nhận Kích Hoạt</span>
            </>
          )}
        </button>

        {/* Countdown Timer (TASK-012) */}
        <div className="text-center pt-1 border-t border-surface-variant/30 text-xs">
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              {resending ? 'Đang gửi lại...' : 'Gửi lại mã OTP mới'}
            </button>
          ) : (
            <p className="text-outline">
              Chưa nhận được mã? Gửi lại sau{' '}
              <span className="font-mono font-bold text-primary">{countdown}s</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

