import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMovieStore } from '../../stores/useMovieStore';

export const SeriesVip: React.FC = () => {
  const { movies } = useMovieStore();
  const navigate = useNavigate();

  if (!movies || movies.length === 0) return null;

  const vipSeries = movies.filter((m) => m.type === 'series');
  if (vipSeries.length === 0) return null;

  return (
    <section className="w-full px-gutter-mobile md:px-gutter lg:px-margin mt-space-xl">
      <div className="flex items-center justify-between mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="w-2.5 h-6 rounded-full bg-secondary" />
          <h2 className="font-headline-lg text-headline-sm lg:text-headline-lg font-bold text-on-surface">
            Series Độc Quyền Dành Cho Gói VIP
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-label-caps text-label-caps flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-[13px]">crown</span>
            CineOriginals
          </span>
        </div>
      </div>

      {/* 4-Column Backdrop-Style Wide Card Grid for Series */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {vipSeries.map((series) => (
          <div
            key={series.id}
            onClick={() => navigate(`/phim/${series.slug || series.id}`)}
            className="group rounded-xl overflow-hidden bg-surface-container shadow-lg hover:shadow-2xl transition-all duration-300 border border-surface-variant/30 hover:border-secondary/50 cursor-pointer"
          >
            <div className="relative aspect-video w-full overflow-hidden">
              <div
                className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('${series.backdrop || series.poster}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />

              {series.badge && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-secondary-container text-on-secondary font-label-caps text-label-caps font-bold shadow-md">
                  {series.badge}
                </div>
              )}

              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-surface-container-lowest/80 text-[11px] font-label-caps text-tertiary backdrop-blur-sm">
                  {series.qualityBadge || '4K'}
                </span>
              </div>
            </div>

            <div className="p-space-sm">
              <p className="font-headline-sm text-body-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                {series.title}
              </p>
              <p className="text-body-sm text-xs text-outline mt-1 line-clamp-2 leading-relaxed">
                {series.synopsis}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
