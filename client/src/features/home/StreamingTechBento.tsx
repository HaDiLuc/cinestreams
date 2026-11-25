import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVipStore } from '../../stores/useVipStore';
import { useAuthStore } from '../../stores/useAuthStore';

export const StreamingTechBento: React.FC = () => {
  const navigate = useNavigate();
  const { openPaymentModal, plans } = useVipStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const familyPlan = plans[2] || plans[0];

  const isVipUser = Boolean(
    isAuthenticated &&
    currentUser && (
      currentUser.isVip ||
      currentUser.vipTier?.toUpperCase().includes('VIP') ||
      currentUser.roles?.some((r: string) => r.toUpperCase().includes('VIP') || r.toUpperCase().includes('ADMIN'))
    )
  );

  return (
    <section className="w-full px-gutter-mobile md:px-gutter lg:px-margin my-space-xl">
      <div className="p-space-lg lg:p-space-xl rounded-3xl bg-surface-container-low relative overflow-hidden shadow-2xl border border-surface-variant/30">
        <div className="max-w-2xl mb-space-xl relative z-10">
          <span className="px-3 py-1 rounded-full bg-primary-container/20 text-primary font-label-caps text-label-caps mb-3 inline-block font-bold">
            CÔNG NGHỆ TIÊN PHONG
          </span>
          <h2 className="font-headline-lg text-headline-sm lg:text-headline-lg font-bold text-on-surface mb-2">
            Chuẩn Mực Điện Ảnh Đỉnh Cao Tại Nhà
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Trải nghiệm giải trí chuẩn rạp hát với hạ tầng CDN phủ sóng 63 tỉnh thành và các công nghệ phát trực tuyến tối tân nhất thị trường.
          </p>
        </div>

        {/* USP Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md relative z-10">
          {/* Card 1: ABR Streaming */}
          <div className="p-space-md rounded-2xl bg-surface-container/80 backdrop-blur-md hover:bg-surface-container-high transition-colors shadow-sm flex flex-col justify-between border border-surface-variant/30">
            <div>
              <div className="w-12 h-12 rounded-xl bg-tertiary-container/15 text-tertiary flex items-center justify-center mb-space-sm">
                <span className="material-symbols-outlined text-2xl">speed</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
                Adaptive Bitrate (ABR)
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Tự động điều chỉnh chất lượng theo băng thông, đảm bảo xem phim siêu mượt mà không bao giờ bị đứng hình hay giật lag.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-variant/40 flex items-center justify-between text-xs text-tertiary">
              <span className="font-mono">Buffer Time: 0.18s</span>
              <span className="material-symbols-outlined text-sm">bolt</span>
            </div>
          </div>

          {/* Card 2: Offline Download */}
          <div className="p-space-md rounded-2xl bg-surface-container/80 backdrop-blur-md hover:bg-surface-container-high transition-colors shadow-sm flex flex-col justify-between border border-surface-variant/30">
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary-container/15 text-primary flex items-center justify-center mb-space-sm">
                <span className="material-symbols-outlined text-2xl">download_for_offline</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
                Tải Offline Xem Mọi Nơi
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Lưu phim về iPad, iPhone hoặc Android TV với độ phân giải Full HD & 4K để thưởng thức thoải mái trên các chuyến bay và du lịch xa.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-variant/40 flex items-center justify-between text-xs text-primary">
              <span>Tiết kiệm 60% dữ liệu</span>
              <span className="material-symbols-outlined text-sm">flight</span>
            </div>
          </div>

          {/* Card 3: Watch Party Live Chat */}
          <div
            onClick={() => {
              navigate('/watch-party');
            }}
            className="p-space-md rounded-2xl bg-surface-container/80 backdrop-blur-md hover:bg-surface-container-high transition-all shadow-sm flex flex-col justify-between border border-surface-variant/30 cursor-pointer group hover:scale-[1.02]"
            title="Vào sảnh phòng xem chung Watch Party"
          >
            <div>
              <div className="flex items-center justify-between mb-space-sm">
                <div className="w-12 h-12 rounded-xl bg-secondary-container/15 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">forum</span>
                </div>
                {!isVipUser && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-[11px] font-bold">
                    VIP 👑
                  </span>
                )}
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1 flex items-center gap-1.5">
                <span>Watch Party Đồng Bộ</span>
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Tạo phòng xem chung tối đa 20 người với tính năng chat voice, thả cảm xúc thời gian thực và tự động khớp khung hình từng mili-giây.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-variant/40 flex items-center justify-between text-xs text-secondary">
              <span className="font-mono">{isVipUser ? 'Độ trễ < 50ms' : 'Mở khóa với gói VIP'}</span>
              <span className="material-symbols-outlined text-sm">{isVipUser ? 'sync' : 'lock'}</span>
            </div>
          </div>

          {/* Card 4: VietQR VIP Activation */}
          <div className="p-space-md rounded-2xl bg-surface-container/80 backdrop-blur-md hover:bg-surface-container-high transition-colors shadow-sm flex flex-col justify-between border border-surface-variant/30">
            <div>
              <div className="w-12 h-12 rounded-xl bg-error-container/20 text-error flex items-center justify-center mb-space-sm">
                <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
                Kích Hoạt VIP VietQR
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Thanh toán tự động bằng mã VietQR, MoMo hoặc Thẻ quốc tế. Kích hoạt tài khoản VIP lập tức sau 3 giây không cần chờ xác nhận.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-variant/40 flex items-center justify-between text-xs text-on-surface">
              <span className="font-semibold text-secondary">Từ 49.000đ/tháng</span>
              <button
                onClick={() => openPaymentModal()}
                className="text-primary hover:underline font-semibold flex items-center gap-0.5"
              >
                <span>Nâng cấp</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick VietQR / VIP Callout Banner */}
        <div className="mt-space-lg p-space-md rounded-2xl bg-gradient-to-r from-secondary-container/25 via-primary-container/20 to-transparent flex flex-col sm:flex-row items-center justify-between gap-space-md border border-primary/20">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-xl">stars</span>
            </div>
            <div>
              <p className="font-headline-sm text-body-md text-on-surface font-bold">
                Ưu Đãi Đặc Biệt: Đăng Ký Gói Gia Đình 1 Năm Tặng Thêm 3 Tháng VIP
              </p>
              <p className="text-body-sm text-body-sm text-outline">
                Áp dụng cho 500 thành viên mới thanh toán qua quét mã VietQR tự động trong tuần này.
              </p>
            </div>
          </div>
          <button
            onClick={() => openPaymentModal(familyPlan)}
            className="px-space-md py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-fixed-dim transition-all shadow-md whitespace-nowrap hover:scale-105 active:scale-95 font-bold"
          >
            Nhận Ưu Đãi Ngay
          </button>
        </div>
      </div>
    </section>
  );
};
