import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useMovieStore } from '../../stores/useMovieStore';
import { useVipStore } from '../../stores/useVipStore';

const PRESET_AVATARS = [
  { id: 'default', name: 'Mặc Định CineStreams', url: '/default-avatar.png' },
  { id: 'vip-gold', name: 'VIP Gold Member', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
  { id: 'director', name: 'Đạo Diễn Điện Ảnh', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: 'star-cinema', name: 'Ngôi Sao Điện Ảnh', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200' },
  { id: 'anime-hero', name: 'Anime Hero', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200' },
  { id: 'cine-critic', name: 'Nhà Phê Bình', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200' },
  { id: 'kids-cartoon', name: 'Hoạt Hình Trẻ Em', url: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=200' }
];

export const AccountPage: React.FC = () => {
  const { currentUser, isAuthenticated, toggleKidsMode, openAuthModal, updateAvatar } = useAuthStore();
  const { watchlist, continueWatching, removeContinueWatching, movies } = useMovieStore();
  const { openPaymentModal } = useVipStore();
  const [activeTab, setActiveTab] = useState<'watchlist' | 'history'>('watchlist');
  const navigate = useNavigate();

  // Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentUser?.avatar || '/default-avatar.png');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('Kích thước ảnh tối đa là 5MB.');
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setSelectedAvatar(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = () => {
    updateAvatar(selectedAvatar);
    setShowAvatarModal(false);
    setToastMessage('Đã cập nhật ảnh đại diện tài khoản thành công!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetDefault = () => {
    setSelectedAvatar('/default-avatar.png');
    setAvatarUrlInput('');
    setFileError(null);
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="w-full max-w-xl mx-auto px-gutter-mobile lg:px-gutter py-24 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-surface-container flex items-center justify-center text-primary shadow-xl">
          <span className="material-symbols-outlined text-4xl">lock</span>
        </div>
        <div className="space-y-2">
          <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
            Yêu Cầu Đăng Nhập
          </h1>
          <p className="text-sm text-outline">
            Vui lòng đăng nhập vào tài khoản CineStreams của bạn để xem thông tin hồ sơ, lịch sử xem và danh sách phim đã lưu.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => openAuthModal('login')}
            className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-bold text-sm shadow-md transition-all"
          >
            Đăng Nhập Ngay
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm transition-all"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  const savedMovies = movies.filter((m) => watchlist.includes(m.id) || watchlist.includes(m.slug || ''));

  return (
    <div className="w-full max-w-[1920px] mx-auto px-gutter-mobile lg:px-gutter py-space-md space-y-space-lg">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-secondary text-surface-container-lowest font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs animate-bounce">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* User Header Profile Card */}
      <div className="p-space-lg rounded-3xl bg-surface-container-low border border-surface-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md shadow-xl">
        <div className="flex items-center gap-4">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => {
              setSelectedAvatar(currentUser.avatar || '/default-avatar.png');
              setShowAvatarModal(true);
            }}
            title="Bấm để thay đổi ảnh đại diện"
          >
            <img
              src={currentUser.avatar || '/default-avatar.png'}
              alt={currentUser.name}
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-full object-cover ring-4 ring-primary/40 shadow-xl group-hover:ring-primary group-hover:opacity-90 transition-all bg-surface-container-highest"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-avatar.png';
              }}
            />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary shadow-lg border-2 border-surface-container-low transition-all"
              title="Đổi ảnh đại diện"
            >
              <span className="material-symbols-outlined text-xs">edit</span>
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-lg text-lg lg:text-2xl font-bold text-on-surface">
                {currentUser.name}
              </h1>
              {currentUser.isVip && (
                <span className="px-3 py-0.5 rounded-full bg-secondary-container text-on-secondary text-xs font-bold flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-sm">workspace_premium</span>
                  VIP: {currentUser.vipTier}
                </span>
              )}
            </div>
            <p className="text-xs text-outline mt-0.5">{currentUser.email}</p>
            <p className="text-xs text-tertiary mt-1">Hạn gói: {currentUser.vipExpiresAt}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedAvatar(currentUser.avatar || '/default-avatar.png');
                setShowAvatarModal(true);
              }}
              className="mt-2 text-xs font-bold text-primary hover:text-primary-fixed-dim inline-flex items-center gap-1 hover:underline transition-colors"
            >
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              <span>Đổi Ảnh Đại Diện</span>
            </button>
          </div>
        </div>

        {/* Actions & Kids Mode Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleKidsMode}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentUser.isKidsMode
                ? 'bg-tertiary-container text-on-tertiary-container ring-2 ring-tertiary'
                : 'bg-surface-container hover:bg-surface-variant text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">child_care</span>
            <span>Chế Độ Trẻ Em: {currentUser.isKidsMode ? 'BẬT' : 'TẮT'}</span>
          </button>

          <button
            onClick={() => openPaymentModal()}
            className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined text-sm">qr_code_2</span>
            <span>Gia Hạn VietQR</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-surface-variant/30 pb-2">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'watchlist'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-outline hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">bookmark</span>
            <span>Danh Sách Muốn Xem ({savedMovies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-outline hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">history</span>
            <span>Lịch Sử Đang Xem ({continueWatching.length})</span>
          </button>
        </div>

        {/* Tab 1: Watchlist */}
        {activeTab === 'watchlist' && (
          <div>
            {savedMovies.length === 0 ? (
              <div className="p-12 text-center text-outline bg-surface-container/40 rounded-2xl">
                <span className="material-symbols-outlined text-4xl mb-2">bookmark_border</span>
                <p>Bạn chưa lưu bộ phim nào vào danh sách muốn xem.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-space-sm lg:gap-space-md">
                {savedMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => navigate(`/phim/${movie.slug || movie.id}`)}
                    className="group relative rounded-xl overflow-hidden bg-surface-container shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-surface-variant/30 hover:border-primary/50"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-surface-container-lowest/80 text-on-surface font-label-caps text-label-caps">
                        {movie.qualityBadge}
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-secondary text-xs font-bold">
                        <span className="material-symbols-outlined text-sm icon-filled">star</span>
                        <span>{movie.imdbRating}</span>
                      </div>
                    </div>
                    <div className="p-space-xs">
                      <p className="font-headline-sm text-body-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                        {movie.title}
                      </p>
                      <p className="text-xs text-outline truncate">{movie.genres.join(' • ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: History */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {continueWatching.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-surface-container shadow-md hover:shadow-2xl transition-all border border-surface-variant/30"
              >
                <div className="relative aspect-video w-full overflow-hidden">
                  <img src={item.backdrop} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[11px] text-white">
                    {Math.floor(item.currentSeconds / 60)}:00 / {Math.floor(item.totalSeconds / 60)}:00
                  </div>
                </div>
                <div className="w-full bg-surface-variant h-1.5">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-on-surface truncate">{item.title}</p>
                    <p className="text-xs text-outline">{item.syncedDevice}</p>
                  </div>
                  <button
                    onClick={() => removeContinueWatching(item.id)}
                    className="p-1 rounded text-error hover:bg-error-container/20"
                    title="Xóa lịch sử"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Change Avatar */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container rounded-3xl border border-surface-variant/40 p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">account_circle</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Thay Đổi Ảnh Đại Diện</h3>
                  <p className="text-xs text-outline">Tùy chỉnh ảnh đại diện tài khoản CineStreams của bạn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-outline hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Preview */}
              <div className="flex flex-col items-center justify-center py-4 bg-surface-container-high/40 rounded-2xl border border-surface-variant/30 space-y-2">
                <div className="relative">
                  <img
                    src={selectedAvatar || '/default-avatar.png'}
                    alt="Xem trước ảnh đại diện"
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-primary shadow-2xl bg-surface-container-highest"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.png';
                    }}
                  />
                  {selectedAvatar === '/default-avatar.png' && (
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-surface-container-lowest text-primary border border-primary/40 text-[10px] font-bold shadow-md">
                      Mặc định
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-on-surface">Xem trước ảnh đại diện mới</p>
                  <p className="text-[11px] text-outline">Hiển thị trên thanh điều hướng, hồ sơ và phòng Xem Chung</p>
                </div>
              </div>

              {/* Option 1: Upload from Device */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface">
                  1. Tải ảnh từ thiết bị của bạn:
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright border border-surface-variant/40 cursor-pointer text-xs font-semibold text-on-surface transition-all shadow-sm">
                    <span className="material-symbols-outlined text-base text-primary">upload_file</span>
                    <span>Chọn File Ảnh Từ Máy Tính</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright border border-surface-variant/40 text-xs font-semibold text-outline hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                    title="Đặt lại ảnh đại diện mặc định"
                  >
                    <span className="material-symbols-outlined text-base">restart_alt</span>
                    <span>Ảnh Mặc Định</span>
                  </button>
                </div>
                {fileError && (
                  <p className="text-xs text-error flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{fileError}</span>
                  </p>
                )}
              </div>

              {/* Option 2: Enter Image URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">
                  2. Hoặc dán đường dẫn link ảnh trực tuyến (URL):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={avatarUrlInput}
                    onChange={(e) => {
                      setAvatarUrlInput(e.target.value);
                      if (e.target.value.trim()) {
                        setSelectedAvatar(e.target.value.trim());
                      }
                    }}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1 bg-surface-container-high px-3 py-2 rounded-xl text-xs text-on-surface outline-none border border-surface-variant/40 focus:border-primary placeholder:text-outline/70"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (avatarUrlInput.trim()) {
                        setSelectedAvatar(avatarUrlInput.trim());
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-primary border border-surface-variant/40 transition-colors shrink-0"
                  >
                    Áp Dụng
                  </button>
                </div>
              </div>

              {/* Option 3: Presets Collection */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-on-surface">
                  3. Chọn nhanh từ bộ sưu tập avatar CineStreams:
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = selectedAvatar === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(preset.url);
                          setAvatarUrlInput('');
                          setFileError(null);
                        }}
                        className={`group relative rounded-2xl overflow-hidden border-2 transition-all p-1 flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/50 bg-primary/10 shadow-lg scale-105'
                            : 'border-surface-variant/40 bg-surface-container-high hover:border-primary/60 hover:scale-102'
                        }`}
                        title={preset.name}
                      >
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/default-avatar.png';
                            }}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary text-base font-bold bg-surface-container-lowest/90 rounded-full p-0.5">
                                check
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-outline group-hover:text-on-surface truncate w-full text-center px-0.5">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-surface-variant/30 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs text-outline hover:text-white font-semibold transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary hover:from-secondary-fixed hover:to-primary-fixed-dim text-surface-container-lowest font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm font-bold">check</span>
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
