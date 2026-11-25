import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMovieStore } from '../../stores/useMovieStore';

export const ContinueWatching: React.FC = () => {
  const { continueWatching, removeContinueWatching } = useMovieStore();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (continueWatching.length === 0) return null;

  return (
    <section className="w-full px-gutter-mobile md:px-gutter lg:px-margin -mt-8 relative z-20">
      <div className="p-space-md lg:p-space-lg rounded-2xl bg-surface-container-low/95 backdrop-blur-2xl shadow-xl border border-surface-variant/30">
        {/* Section Header with Cloud Sync status */}
        <div className="flex items-center justify-between mb-space-md flex-wrap gap-2">
          <div className="flex items-center gap-space-sm">
            <div className="w-2.5 h-6 rounded-full bg-primary-container" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
              Tiếp Tục Xem
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-md text-label-md">
              {continueWatching.length} nội dung
            </span>
          </div>

          <div className="flex items-center gap-2 text-outline font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-sm text-primary animate-pulse">
              cloud_sync
            </span>
            <span className="hidden sm:inline">Đồng bộ đám mây tức thì trên mọi thiết bị</span>
            <Link
              to="/tai-khoan"
              className="text-primary hover:underline font-label-md text-label-md ml-2 flex items-center gap-1"
            >
              Lịch sử xem <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Continue Watching Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {continueWatching.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl overflow-hidden bg-surface-container shadow-md hover:shadow-2xl transition-all duration-300 border border-surface-variant/30 hover:border-primary/40"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url('${item.backdrop}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/30 to-transparent" />

                {/* Quick Play Icon Button Overlay */}
                <div
                  onClick={() => navigate(`/xem-phim/${item.movieId}`)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                >
                  <button className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.8)] scale-90 group-hover:scale-100 transition-all">
                    <span className="material-symbols-outlined text-2xl icon-filled">play_arrow</span>
                  </button>
                </div>

                {/* Device Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/80 backdrop-blur-md text-[11px] font-label-caps text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-tertiary">
                    {item.deviceIcon}
                  </span>
                  <span>{item.syncedDevice}</span>
                </div>

                {/* Timestamp Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-label-caps text-label-caps text-on-surface font-mono">
                  {Math.floor(item.currentSeconds / 60)}:{(item.currentSeconds % 60).toString().padStart(2, '0')} / {Math.floor(item.totalSeconds / 60)}:00
                </div>
              </div>

              {/* Progress Bar Line */}
              <div className="w-full bg-surface-variant h-1.5 relative">
                <div
                  className="bg-gradient-to-r from-secondary to-primary h-full rounded-r transition-all duration-500"
                  style={{ width: `${item.percent}%` }}
                />
              </div>

              {/* Progress Card Details */}
              <div className="p-space-sm flex items-center justify-between relative">
                <div
                  onClick={() => navigate(`/xem-phim/${item.movieId}`)}
                  className="cursor-pointer overflow-hidden flex-1 pr-2"
                >
                  <p className="font-headline-sm text-body-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="font-body-sm text-xs text-outline truncate">{item.episodeInfo}</p>
                </div>

                {/* More Vert Menu */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                    className="text-outline hover:text-primary p-1 transition-colors rounded-full hover:bg-surface-variant"
                    title="Tùy chọn"
                  >
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                  </button>

                  {activeMenuId === item.id && (
                    <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl bg-surface-container-highest shadow-xl border border-surface-variant/40 p-1.5 z-30 animate-fade-in text-xs">
                      <button
                        onClick={() => {
                          removeContinueWatching(item.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-error hover:bg-error-container/20 transition-colors text-left"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        <span>Xóa khỏi danh sách</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
