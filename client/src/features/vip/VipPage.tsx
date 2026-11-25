import React from 'react';
import { useVipStore } from '../../stores/useVipStore';
import { VIP_PLANS } from '../../data/plansData';

export const VipPage: React.FC = () => {
  const { billingCycle, setBillingCycle, openPaymentModal } = useVipStore();

  return (
    <div className="w-full max-w-[1920px] mx-auto px-gutter-mobile lg:px-gutter py-space-md space-y-space-xl">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 pt-4">
        <span className="px-3 py-1 rounded-full bg-secondary-container/20 text-secondary-fixed text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">workspace_premium</span>
          Hội Viên CineStreams VIP
        </span>
        <h1 className="font-display-hero text-3xl lg:text-5xl font-bold text-on-surface">
          Nâng Tầm Trải Nghiệm Chuẩn Điện Ảnh 4K
        </h1>
        <p className="text-sm lg:text-base text-on-surface-variant leading-relaxed">
          Thưởng thức toàn bộ kho phim chiếu rạp mới nhất không giới hạn, không quảng cáo, cùng công nghệ 4K Dolby Vision & Dolby Atmos độc quyền.
        </p>

        {/* Billing Cycle Switcher */}
        <div className="inline-flex items-center p-1 rounded-full bg-surface-container-high border border-surface-variant/40 mt-4">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Thanh Toán Hàng Tháng
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-secondary text-on-secondary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Thanh Toán 1 Năm</span>
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-bold">
              Tiết kiệm 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md max-w-6xl mx-auto items-stretch">
        {VIP_PLANS.map((plan) => {
          const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-space-md lg:p-space-lg flex flex-col justify-between transition-all duration-300 relative border ${
                plan.isPopular
                  ? 'bg-gradient-to-b from-surface-container-high to-surface-container border-primary shadow-[0_0_36px_rgba(245,158,11,0.25)] scale-105 z-10'
                  : 'bg-surface-container-low border-surface-variant/40 shadow-lg hover:border-surface-variant'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-secondary-container to-primary-container text-on-secondary text-[11px] font-bold uppercase tracking-wider shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mt-2">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display-hero text-3xl lg:text-4xl font-extrabold text-on-surface">
                    {price.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-xs text-outline">
                    /{billingCycle === 'yearly' ? 'năm' : 'tháng'}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-variant/30 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-on-surface font-semibold">
                    <span className="material-symbols-outlined text-primary text-base">tv</span>
                    <span>{plan.maxDevices} thiết bị phát đồng thời</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface font-semibold">
                    <span className="material-symbols-outlined text-tertiary text-base">high_quality</span>
                    <span>Độ phân giải: {plan.resolution}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface font-semibold">
                    <span className="material-symbols-outlined text-secondary text-base">surround_sound</span>
                    <span>Âm thanh: {plan.sound}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-variant/30 space-y-2">
                  <p className="text-xs text-outline font-semibold">Quyền lợi chi tiết:</p>
                  <ul className="space-y-1.5 text-xs text-on-surface-variant">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-primary text-sm flex-shrink-0">check</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-variant/30">
                <button
                  onClick={() => openPaymentModal(plan)}
                  className={`w-full py-3 rounded-full font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-102 active:scale-98 ${
                    plan.isPopular
                      ? 'bg-primary text-on-primary shadow-primary/30'
                      : 'bg-surface-container-highest hover:bg-surface-bright text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">qr_code_2</span>
                  <span>Quét VietQR Kích Hoạt Ngay</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* VietQR Features Section */}
      <div className="p-space-lg rounded-3xl bg-surface-container-low border border-surface-variant/30 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">bolt</span>
          </div>
          <div>
            <h4 className="font-bold text-base text-on-surface">Thanh toán tự động siêu tốc 3 giây</h4>
            <p className="text-xs text-outline mt-0.5 leading-relaxed">
              Quét mã bằng bất kỳ ứng dụng ngân hàng nào (MB, Vietcombank, Techcombank, VPBank, MoMo...) hệ thống tự động nhận diện và mở khóa 4K lập tức!
            </p>
          </div>
        </div>
        <button
          onClick={() => openPaymentModal(VIP_PLANS[1])}
          className="px-6 py-2.5 rounded-full bg-secondary text-on-secondary text-xs font-bold whitespace-nowrap hover:scale-105 transition-all shadow-md"
        >
          Trải Nghiệm VietQR
        </button>
      </div>
    </div>
  );
};
