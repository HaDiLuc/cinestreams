import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { SubProfile } from '../../types';

export const ProfileSelectionPage: React.FC = () => {
  const { subProfiles, switchProfile, logout } = useAuthStore();
  const [pinTarget, setPinTarget] = useState<SubProfile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const navigate = useNavigate();

  const handleProfileClick = (profile: SubProfile) => {
    if (profile.pinRequired) {
      setPinTarget(profile);
      setPinInput('');
      setPinError(false);
    } else {
      switchProfile(profile.id);
      navigate('/');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTarget) return;
    if (pinInput === pinTarget.pin || pinInput === '1234') {
      switchProfile(pinTarget.id);
      setPinTarget(null);
      navigate('/');
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-margin-mobile md:px-margin py-space-xl space-y-space-xl">
      {/* Header Info */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="font-label-caps text-label-caps uppercase tracking-widest text-primary flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          Phân Hệ Định Danh &amp; Truy Cập Gia Đình CineStreams
        </span>
        <h1 className="font-display-hero text-3xl md:text-5xl font-bold text-on-surface">
          Ai Đang Thưởng Thức Điện Ảnh Hôm Nay?
        </h1>
        <p className="font-body-lg text-body-md md:text-body-lg text-on-surface-variant leading-relaxed">
          Mỗi hồ sơ sở hữu tủ phim cá nhân, lịch sử xem dở, thuật toán gợi ý CineAI độc lập và cài đặt kiểm soát phụ huynh riêng biệt.
        </p>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-space-lg max-w-6xl mx-auto">
        {subProfiles.map((p) => (
          <div
            key={p.id}
            onClick={() => handleProfileClick(p)}
            className="group relative bg-surface-container-low/85 backdrop-blur-xl rounded-2xl p-space-lg flex flex-col items-center text-center justify-between shadow-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_36px_-6px_rgba(245,158,11,0.35)] cursor-pointer border border-surface-variant/40 hover:border-primary/50"
          >
            {p.pinRequired ? (
              <div className="absolute top-3.5 right-3.5 bg-error-container/40 text-error rounded-full px-2 py-0.5 font-label-caps text-label-caps flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                <span>PIN 4 Số</span>
              </div>
            ) : (
              <div className="absolute top-3.5 right-3.5 bg-primary/20 text-primary rounded-full px-2 py-0.5 font-label-caps text-label-caps flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-[13px]">lock_open</span>
                <span>Mở</span>
              </div>
            )}

            <div className="flex flex-col items-center w-full mt-2">
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-2xl p-1 bg-gradient-to-tr from-primary via-secondary to-primary-container transition-transform duration-300 group-hover:scale-105">
                <img
                  src={p.avatar || '/default-avatar.png'}
                  alt={p.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-avatar.png';
                  }}
                />
              </div>

              <div className="mt-space-md flex flex-col items-center">
                <h3 className="font-headline-sm text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                  {p.name}
                </h3>
                <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-caps text-label-caps uppercase tracking-wider font-semibold">
                  {p.role}
                </span>
              </div>

              {p.currentMovie && (
                <div className="w-full mt-space-md bg-surface-container/70 rounded-xl p-space-sm text-left flex flex-col gap-1.5 border border-surface-variant/30">
                  <div className="flex items-center justify-between text-on-surface-variant font-label-caps text-label-caps">
                    <span className="truncate max-w-[130px] font-semibold text-on-surface">
                      {p.currentMovie}
                    </span>
                    <span className="text-primary font-bold">{p.currentEpisode}</span>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${p.progressPercent || 50}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-outline">Độ tuổi: {p.maturityRating || '18+'}</span>
                </div>
              )}
            </div>

            <button className="w-full mt-space-md h-11 rounded-xl bg-gradient-to-r from-primary via-secondary to-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              <span>Vào Xem Ngay</span>
            </button>
          </div>
        ))}

        {/* Add New Profile Card */}
        <div
          onClick={() => alert('Tính năng tạo hồ sơ mới cho phép thêm tối đa 5 thành viên trong gói VIP!')}
          className="group relative bg-surface-container-low/50 backdrop-blur-xl rounded-2xl p-space-lg flex flex-col items-center text-center justify-center shadow-xl border-2 border-dashed border-surface-variant/60 hover:border-primary/60 transition-all duration-300 hover:scale-[1.02] cursor-pointer min-h-[380px]"
        >
          <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-outline group-hover:text-primary group-hover:scale-110 transition-all">
            <span className="material-symbols-outlined text-4xl">add</span>
          </div>
          <h3 className="font-headline-sm text-base font-bold text-on-surface mt-4 group-hover:text-primary transition-colors">
            Tạo Hồ Sơ Mới
          </h3>
          <p className="text-xs text-outline mt-1 max-w-[180px]">
            Tối đa 5 hồ sơ thành viên độc lập trong cùng gia đình.
          </p>
        </div>
      </div>

      {/* Logout / Switch Account Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={() => {
            logout();
            navigate('/dang-nhap');
          }}
          className="px-6 py-2.5 rounded-full bg-surface-container-high hover:bg-error-container hover:text-error text-on-surface text-xs font-semibold flex items-center gap-2 transition-colors shadow-md"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Đăng Xuất Tài Khoản</span>
        </button>
      </div>

      {/* PIN Verification Modal */}
      {pinTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in"
          onClick={() => setPinTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-surface-container-low border border-surface-variant/50 p-space-lg text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto ring-2 ring-primary">
              <img
                src={pinTarget.avatar || '/default-avatar.png'}
                alt={pinTarget.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.png';
                }}
              />
            </div>

            <div>
              <h3 className="font-bold text-base text-on-surface">Khóa Bảo Mật: {pinTarget.name}</h3>
              <p className="text-xs text-outline mt-0.5">Vui lòng nhập mã PIN 4 chữ số (Demo: 1234)</p>
            </div>

            {pinError && <p className="text-xs text-error font-bold">Mã PIN không đúng, vui lòng thử lại!</p>}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-36 h-12 text-center font-display-hero text-2xl tracking-[0.5em] rounded-xl bg-surface-container text-primary outline-none border-2 border-primary mx-auto block"
                autoFocus
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPinTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs text-outline hover:text-on-surface"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:scale-105 transition-all"
                >
                  Xác Nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
