import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMovieStore } from '../../stores/useMovieStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useVipStore } from '../../stores/useVipStore';

export const HeroBanner: React.FC = () => {
  const { heroMovies, activeHeroIndex, setActiveHeroIndex, nextHero, prevHero, toggleWatchlist, watchlist } = useMovieStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const { openPaymentModal } = useVipStore();
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const navigate = useNavigate();

  const isVipUser = Boolean(
    isAuthenticated &&
    currentUser && (
      currentUser.isVip ||
      currentUser.vipTier?.toUpperCase().includes('VIP') ||
      currentUser.roles?.some((r: string) => r.toUpperCase().includes('VIP') || r.toUpperCase().includes('ADMIN'))
    )
  );

  const handleWatchPartyClick = () => {
    navigate('/watch-party');
  };

  // Auto rotate banner every 7 seconds
  useEffect(() => {
    if (!heroMovies || heroMovies.length <= 1) return;
    const timer = setInterval(() => {
      nextHero();
    }, 7000);
    return () => clearInterval(timer);
  }, [nextHero, heroMovies]);

  if (!heroMovies || heroMovies.length === 0) {
    return (
      <section className="relative w-full -mt-20 overflow-hidden bg-surface-container-lowest">
        <div className="relative w-full min-h-[480px] lg:h-[560px] flex items-center justify-center">
          <div className="text-center space-y-3 z-10 p-6">
            <h1 className="font-display-hero text-2xl lg:text-4xl font-bold uppercase tracking-tight text-on-surface">
              Chào Mừng Đến Với CineStreams
            </h1>
            <p className="text-sm text-outline max-w-md mx-auto">
              Nền tảng xem phim trực tuyến 4K HDR & âm thanh vòm Dolby Atmos hàng đầu.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const currentMovie = heroMovies[activeHeroIndex] || heroMovies[0];
  const isSaved = watchlist.includes(currentMovie.id) || watchlist.includes(currentMovie.slug || '');

  return (
    <section className="relative w-full -mt-20 overflow-hidden bg-surface-container-lowest">
      {/* Hero Background Visual Canvas */}
      <div className="relative w-full min-h-[720px] lg:h-[840px] flex items-end">
        {/* Background Image with Scrim Gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-100"
          style={{ backgroundImage: `url('${currentMovie.backdrop}')` }}
        />

        {/* Layered Cinematic Scrims (Shadow, depth & contrast protection) */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/60 to-surface-container-lowest/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/80 to-transparent w-full lg:w-3/4" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Hero Content Container */}
        <div className="relative z-10 w-full px-gutter-mobile md:px-gutter lg:px-margin pt-40 pb-16 flex flex-col justify-end">
          {/* Film Meta Capsules & CineAI Match */}
          <div className="flex flex-wrap items-center gap-space-xs mb-space-sm animate-fade-in">
            <span className="px-2.5 py-1 rounded-full bg-secondary-container/20 text-secondary-fixed text-label-caps font-label-caps flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] icon-filled">star</span>
              IMDb {currentMovie.imdbRating}
            </span>

            <span className="px-2.5 py-1 rounded-full bg-surface-container-high/80 text-primary font-label-caps text-label-caps flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">smart_display</span>
              {currentMovie.qualityBadge}
            </span>

            <span className="px-2.5 py-1 rounded-full bg-surface-container-high/80 text-on-surface font-label-caps text-label-caps">
              {currentMovie.audioBadge}
            </span>

            <span className="px-2.5 py-1 rounded-full bg-surface-container-high/80 text-tertiary font-label-caps text-label-caps flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-ping" />
              ABR STREAMING 60FPS
            </span>

            <span className="px-2.5 py-1 rounded-full bg-error-container/60 text-error font-label-caps text-label-caps">
              {currentMovie.ageRating}
            </span>

            <span className="px-3 py-1 rounded-full bg-tertiary-container/15 text-tertiary font-label-caps text-label-caps flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              CineAI Match: {currentMovie.cineAiMatch}%
            </span>
          </div>

          {/* Blockbuster Title */}
          <h1 className="font-display-hero text-display-hero-mobile lg:text-display-hero tracking-tight text-on-surface font-bold uppercase max-w-4xl leading-none mb-space-xs drop-shadow-md">
            {currentMovie.title}
          </h1>

          {/* Vietnamese Synopsis */}
          <p className="font-body-lg text-body-md lg:text-body-lg text-on-surface-variant max-w-2xl line-clamp-3 mb-space-md leading-relaxed">
            {currentMovie.synopsis}
          </p>

          {/* Genre Tags Row */}
          <div className="flex flex-wrap items-center gap-space-xs text-body-sm font-body-sm text-outline mb-space-lg">
            {currentMovie.genres.map((genre, idx) => (
              <React.Fragment key={genre}>
                <span
                  onClick={() => navigate('/bo-loc')}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  {genre}
                </span>
                {idx < currentMovie.genres.length - 1 && <span>•</span>}
              </React.Fragment>
            ))}
            <span>•</span>
            <span className="text-on-surface-variant">
              Thời lượng: {currentMovie.duration} ({currentMovie.releaseYear})
            </span>
          </div>

          {/* CTAs & Interactive Buttons */}
          <div className="flex flex-wrap items-center gap-space-sm mb-space-xl">
            {/* Primary CTA Button */}
            <button
              onClick={() => navigate(`/xem-phim/${currentMovie.slug || currentMovie.id}`)}
              className="h-12 px-space-lg rounded-full bg-gradient-to-r from-secondary-container via-primary-container to-primary text-on-primary-container font-label-lg text-label-lg flex items-center gap-2 shadow-[0_0_28px_rgba(245,158,11,0.45)] hover:shadow-[0_0_36px_rgba(245,158,11,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-2xl icon-filled">play_arrow</span>
              <span>Xem Ngay (4K HDR)</span>
            </button>

            {/* Watch Party CTA Button */}
            <button
              onClick={handleWatchPartyClick}
              className="h-12 px-space-md rounded-full bg-surface-container-high/80 hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg flex items-center gap-2 backdrop-blur-xl shadow-md hover:scale-[1.02] transition-all group"
              type="button"
              title={isVipUser ? "Vào phòng Watch Party" : "Nâng cấp gói VIP để mở khóa Watch Party"}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
              </span>
              <span className="material-symbols-outlined text-xl text-tertiary group-hover:rotate-12 transition-transform">
                groups
              </span>
              <span>Tạo Watch Party</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded text-label-caps font-label-caps ${
                isVipUser ? 'bg-surface-container text-tertiary' : 'bg-secondary/20 text-secondary font-bold'
              }`}>
                {isVipUser ? 'Live' : 'VIP 👑'}
              </span>
            </button>

            {/* Watchlist Button */}
            <button
              onClick={() => toggleWatchlist(currentMovie.id)}
              className={`w-12 h-12 rounded-full bg-surface-container-high/80 hover:bg-surface-container-highest flex items-center justify-center backdrop-blur-xl transition-all shadow-md ${
                isSaved ? 'text-primary' : 'text-on-surface hover:text-primary'
              }`}
              title={isSaved ? 'Đã lưu vào danh sách' : 'Thêm vào danh sách muốn xem'}
              type="button"
            >
              <span className={`material-symbols-outlined text-2xl ${isSaved ? 'icon-filled' : ''}`}>
                {isSaved ? 'bookmark_added' : 'bookmark_add'}
              </span>
            </button>

            {/* Trailer Modal Button */}
            <button
              onClick={() => setIsTrailerOpen(true)}
              className="w-12 h-12 rounded-full bg-surface-container-high/80 hover:bg-surface-container-highest text-on-surface flex items-center justify-center backdrop-blur-xl hover:text-primary transition-all shadow-md"
              title="Xem Trailer Official"
              type="button"
            >
              <span className="material-symbols-outlined text-2xl">movie</span>
            </button>
          </div>

          {/* Carousel Slide Indicators & Controls */}
          <div className="flex items-center justify-between w-full pt-space-xs">
            <div className="flex items-center gap-space-sm flex-wrap">
              {heroMovies.map((movie, idx) => {
                const isActive = idx === activeHeroIndex;
                return (
                  <div
                    key={movie.id}
                    onClick={() => setActiveHeroIndex(idx)}
                    className={`flex items-center gap-2 cursor-pointer group transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? 'w-10 bg-primary shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                          : 'w-4 group-hover:w-8 bg-surface-variant'
                      }`}
                    />
                    <span
                      className={`font-label-caps text-label-caps uppercase ${
                        isActive ? 'text-primary font-bold' : 'text-outline hidden md:inline'
                      }`}
                    >
                      0{idx + 1} / {movie.title.split(':')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Prev / Next Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevHero}
                className="w-9 h-9 rounded-full bg-surface-container-high/90 hover:bg-surface-bright flex items-center justify-center text-on-surface shadow-sm transition-transform active:scale-90"
                title="Trước"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <button
                onClick={nextHero}
                className="w-9 h-9 rounded-full bg-surface-container-high/90 hover:bg-surface-bright flex items-center justify-center text-on-surface shadow-sm transition-transform active:scale-90"
                title="Kế tiếp"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Dialog Modal */}
      {isTrailerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setIsTrailerOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-surface-variant/40"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsTrailerOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-primary hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <iframe
              src="https://www.youtube.com/embed/Way9Dexny3w?autoplay=1"
              title="Official Trailer"
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
};
