import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVipStore } from '../stores/useVipStore';
import { useAuthStore } from '../stores/useAuthStore';
import { apiClient } from '../services/apiClient';

export const VipPaymentModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    isPaymentModalOpen,
    closePaymentModal,
    selectedPlan,
    currentOrder,
    paymentStatus,
    secondsRemaining,
    decrementTimer,
    voucherCode,
    applyVoucher,
    voucherDiscountPercent
  } = useVipStore();
  const { isAuthenticated, currentUser, upgradeVip } = useAuthStore();
  const [inputVoucher, setInputVoucher] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [checkNotice, setCheckNotice] = useState<string | null>(null);

  // Timer countdown
  useEffect(() => {
    if (!isPaymentModalOpen || paymentStatus !== 'pending' || !isAuthenticated) return;
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaymentModalOpen, paymentStatus, decrementTimer, isAuthenticated]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCheckPayment = async () => {
    if (!isAuthenticated || !currentUser) {
      alert('Bạn chưa đăng nhập! Vui lòng đăng nhập tài khoản trước khi thực hiện thanh toán.');
      closePaymentModal();
      navigate('/dang-nhap');
      return;
    }
    if (!currentOrder) return;

    setCheckingPayment(true);
    setCheckNotice('Đang kết nối cổng VietQR / Napas đối soát giao dịch...');

    try {
      const res = await apiClient.get<any>(`/vietqr/verify/${currentOrder.orderId}`);
      if (res && ((res as any).status === 'PAID_VERIFIED' || res.data?.status === 'PAID_VERIFIED' || res.success)) {
        upgradeVip(selectedPlan.name);
        setCheckNotice(null);
      } else {
        setCheckNotice(`Chưa nhận được giao dịch khớp mã ${currentOrder.orderId}. Vui lòng thử lại sau giây lát!`);
      }
    } catch {
      setCheckNotice('Hệ thống đang kiểm tra biến động số dư. Vui lòng bấm kiểm tra lại sau vài giây.');
    } finally {
      setCheckingPayment(false);
    }
  };

  if (!isPaymentModalOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-fade-in"
      onClick={closePaymentModal}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl bg-surface-container-low border border-surface-variant/50 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-space-md border-b border-surface-variant/30 bg-surface-container">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
            </span>
            <div>
              <h3 className="font-headline-sm text-sm lg:text-base font-bold text-on-surface">
                Thanh Toán Tự Động VietQR 24/7
              </h3>
              <p className="text-[11px] text-outline">
                {isAuthenticated && currentUser
                  ? `Đang kích hoạt cho tài khoản: ${currentUser.name}`
                  : 'Yêu cầu đăng nhập tài khoản'}
              </p>
            </div>
          </div>
          <button
            onClick={closePaymentModal}
            className="p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Chặn lỗi: Chưa đăng nhập đã thanh toán thành công */}
        {!isAuthenticated ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">lock_person</span>
            </div>
            <div>
              <h4 className="font-headline-lg text-lg font-bold text-on-surface">
                Vui Lòng Đăng Nhập Để Nâng Cấp VIP
              </h4>
              <p className="text-xs text-on-surface-variant mt-1.5 max-w-md mx-auto leading-relaxed">
                Để hệ thống kích hoạt gói <strong className="text-primary">{selectedPlan.name}</strong> đúng tài khoản của bạn, bạn cần đăng nhập tài khoản CineStreams trước khi quét mã thanh toán.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  closePaymentModal();
                  navigate('/dang-nhap');
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>Đăng Nhập Ngay</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closePaymentModal();
                  navigate('/dang-ky');
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface font-semibold text-xs hover:bg-surface-variant transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>Đăng Ký Tài Khoản</span>
              </button>
            </div>
          </div>
        ) : paymentStatus === 'success' ? (
          /* Payment Success State */
          <div className="p-space-lg text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto animate-bounce">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <div>
              <h4 className="font-headline-lg text-xl font-bold text-on-surface">
                Nâng Cấp VIP Thành Công!
              </h4>
              <p className="text-sm text-on-surface-variant mt-1">
                Gói <span className="text-primary font-bold">{selectedPlan.name}</span> đã được kích
                hoạt ngay lập tức cho tài khoản <strong className="text-white">{currentUser?.name}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container/60 border border-primary/30 max-w-sm mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between text-outline">
                <span>Tài khoản:</span>
                <span className="font-semibold text-white">{currentUser?.email}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Mã đơn:</span>
                <span className="font-mono text-on-surface font-semibold">{currentOrder?.orderId}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Trạng thái:</span>
                <span className="text-primary font-bold">Đã kích hoạt 4K Dolby Atmos</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Hạn dùng:</span>
                <span className="text-on-surface">24/11/2026 (12 tháng)</span>
              </div>
            </div>

            <button
              onClick={closePaymentModal}
              className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold shadow-lg hover:scale-105 transition-all"
            >
              Bắt Đầu Trải Nghiệm Ngay
            </button>
          </div>
        ) : (
          /* VietQR Code & Payment Details */
          <div className="p-space-md lg:p-space-lg space-y-space-md">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-space-md items-center">
              {/* Left: QR Code Box */}
              <div className="sm:col-span-5 flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-primary/40 relative group">
                  {currentOrder?.qrUrl ? (
                    <img
                      src={currentOrder.qrUrl}
                      alt="VietQR Payment"
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl animate-spin text-primary">
                        progress_activity
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 rounded-xl pointer-events-none"></div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold">
                  <span className="material-symbols-outlined text-sm animate-pulse">timer</span>
                  <span>Mã QR hết hạn sau: {formattedTime}</span>
                </div>
              </div>

              {/* Right: Bank Details & Copy syntax */}
              <div className="sm:col-span-7 space-y-3">
                <div className="p-3 rounded-xl bg-surface-container space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-outline">Ngân hàng:</span>
                    <span className="font-semibold text-on-surface">MBBank (Quân Đội)</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-outline">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary text-sm">
                        {currentOrder?.accountNumber || '0345469878'}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(currentOrder?.accountNumber || '0345469878', 'stk')
                        }
                        className="p-1 rounded hover:bg-surface-variant text-outline hover:text-on-surface"
                        title="Sao chép"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedField === 'stk' ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-outline">Chủ tài khoản:</span>
                    <span className="font-semibold text-on-surface text-[11px]">
                      {currentOrder?.accountName || 'HA DINH LUC'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-outline">Số tiền cần chuyển:</span>
                    <span className="font-bold text-secondary text-sm">
                      {currentOrder?.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <div className="pt-2 border-t border-surface-variant/40 flex items-center justify-between bg-primary-container/10 p-1.5 rounded-lg">
                    <span className="text-outline font-semibold">Nội dung CK:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary text-sm">
                        {currentOrder?.syntax || 'CS 889922'}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(currentOrder?.syntax || 'CS 889922', 'syntax')
                        }
                        className="px-2 py-0.5 rounded bg-primary text-on-primary font-bold text-[10px] flex items-center gap-1"
                      >
                        {copiedField === 'syntax' ? 'Đã chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Voucher Box */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={inputVoucher}
                    onChange={(e) => setInputVoucher(e.target.value)}
                    placeholder="Nhập mã voucher (Thử: VIP2025)"
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-surface-variant/40 text-xs text-on-surface placeholder:text-outline outline-none focus:border-primary uppercase"
                  />
                  <button
                    onClick={() => {
                      if (applyVoucher(inputVoucher)) {
                        alert('Áp dụng mã VIP2025 thành công! Giảm ngay 20%.');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-highest text-on-surface hover:bg-surface-bright text-xs font-semibold whitespace-nowrap"
                  >
                    Áp dụng
                  </button>
                </div>
                {voucherDiscountPercent > 0 && (
                  <p className="text-[11px] text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    Đã giảm {voucherDiscountPercent}% với mã {voucherCode}
                  </p>
                )}
              </div>
            </div>

            {/* Live Webhook / Transaction Verification */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-surface-container via-surface-container-high to-surface-container flex flex-col sm:flex-row items-center justify-between gap-2 border border-surface-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary animate-spin text-base">
                  sync
                </span>
                <span className="text-xs text-on-surface-variant">
                  Hệ thống tự động lắng nghe biến động số dư Napas 24/7...
                </span>
              </div>
              <button
                onClick={handleCheckPayment}
                disabled={checkingPayment}
                className="px-4 py-1.5 rounded-full bg-primary text-on-primary font-label-md text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">
                  {checkingPayment ? 'hourglass_top' : 'verified'}
                </span>
                <span>{checkingPayment ? 'Đang Kiểm Tra...' : 'Kiểm Tra Giao Dịch'}</span>
              </button>
            </div>
            {checkNotice && (
              <p className="text-[11px] text-secondary text-center font-medium">
                {checkNotice}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
