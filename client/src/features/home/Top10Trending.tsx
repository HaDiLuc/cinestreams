import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMovieStore } from '../../stores/useMovieStore';
import { parseViewCount, formatFullViews } from '../../utils/formatters';

export const Top10Trending: React.FC = () => {
  const { movies } = useMovieStore();
  const [filter, setFilter] = useState<'all' | 'movie' | 'series'>('all');
  const navigate = useNavigate();

  if (!movies || movies.length === 0) return null;

  const filteredMovies = [...movies]
    .filter((m) => {
      if (filter === 'all') return true;
      return m.type === filter;
    })
    .sort((a, b) => {
      const bViews = b.viewCount ?? parseViewCount(b.views);
      const aViews = a.viewCount ?? parseViewCount(a.views);
      return bViews - aViews;
    })
    .slice(0, 10)
    .map((m, idx) => ({ ...m, rank: idx + 1 }));

  if (filteredMovies.length === 0) return null;

  return (
    <section className="w-full px-gutter-mobile md:px-gutter lg:px-margin mt-space-xl">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-space-sm mb-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-xl icon-filled">
              trending_up
            </span>
            <span className="text-primary font-label-caps text-label-caps uppercase tracking-wider font-bold">
              Cập Nhật Trực Tiếp
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-sm lg:text-headline-lg font-bold text-on-surface">
            Top Thịnh Hành Hôm Nay Tại Việt Nam
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('movie')}
            className={`px-3 py-1 rounded-full font-label-md text-label-md transition-colors ${
              filter === 'movie'
                ? 'bg-primary-container text-on-primary-container font-bold'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
            }`}
          >
            Phim Lẻ
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full font-label-md text-label-md transition-colors ${
              filter === 'all'
                ? 'bg-primary-container text-on-primary-container font-bold'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
            }`}
          >
            Tất Cả
          </button>
          <button
            onClick={() => setFilter('series')}
            className={`px-3 py-1 rounded-full font-label-md text-label-md transition-colors ${
              filter === 'series'
                ? 'bg-primary-container text-on-primary-container font-bold'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'
            }`}
          >
            Phim Bộ
          </button>
        </div>
      </div>

      {/* Horizontal Overflow Ranking Reel */}
      <div className="flex items-center gap-space-lg overflow-x-auto pb-space-md scrollbar-none pt-2">
        {filteredMovies.map((movie) => (
          <div
            key={movie.id}
            onClick={() => navigate(`/phim/${movie.slug || movie.id}`)}
            className="flex-shrink-0 w-64 lg:w-72 relative group cursor-pointer"
          >
            <div className="flex items-end">
              {/* Big stylized ranking numeral behind poster */}
              <span className="font-display-hero text-8xl lg:text-9xl font-extrabold text-secondary/30 select-none -mr-8 -mb-4 z-0 group-hover:text-primary transition-colors duration-300">
                {movie.rank}
              </span>

              {/* Poster container */}
              <div className="relative w-48 lg:w-56 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl z-10 group-hover:scale-105 transition-transform duration-300 border border-surface-variant/40 group-hover:border-primary/50">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${movie.poster || movie.backdrop}')` }}
                />

                {movie.badge && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-secondary-container text-on-secondary font-label-caps text-label-caps flex items-center gap-1 shadow-sm font-bold">
                    <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                    {movie.badge}
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md border border-surface-variant/30">
                  <p className="font-label-md text-label-md text-on-surface truncate font-bold group-hover:text-primary transition-colors">
                    {movie.title}
                  </p>
                  <div className="flex items-center justify-between text-xs text-outline mt-0.5">
                    <span className="text-secondary font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] icon-filled">visibility</span>
                      {formatFullViews(movie.viewCount ?? movie.views)}
                    </span>
                    <span className="text-primary font-bold">{movie.qualityBadge || '4K'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
