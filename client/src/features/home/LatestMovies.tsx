import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMovieStore } from '../../stores/useMovieStore';

export const LatestMovies: React.FC = () => {
  const { movies } = useMovieStore();
  const navigate = useNavigate();

  if (!movies || movies.length === 0) return null;

  // Lấy các phim lẻ hoặc phim mới nhất trong hệ thống
  const cinemaMovies = movies.filter((m) => m.type !== 'series');
  const displayMovies = cinemaMovies.length > 0 ? cinemaMovies.slice(0, 12) : movies.slice(0, 12);

  return (
    <section className="w-full px-gutter-mobile md:px-gutter lg:px-margin mt-space-xl">
      {/* Section Title & View All */}
      <div className="flex items-center justify-between mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="w-2.5 h-6 rounded-full bg-primary" />
          <h2 className="font-headline-lg text-headline-sm lg:text-headline-lg font-bold text-on-surface">
            Phim Mới Nhất
          </h2>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-caps text-label-caps font-semibold">
            Bản quyền 4K Ultra HD
          </span>
        </div>
        <Link
          to="/phim-le"
          className="text-primary hover:underline font-label-md text-label-md flex items-center gap-1 group"
        >
          <span>Xem tất cả kho phim</span>
          <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* 6 Column Media Poster Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-space-sm lg:gap-space-md">
        {displayMovies.map((movie) => (
          <div
            key={movie.id}
            onClick={() => navigate(`/phim/${movie.slug || movie.id}`)}
            className="group relative rounded-xl overflow-hidden bg-surface-container shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-surface-variant/30 hover:border-primary/50"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden">
              <div
                className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('${movie.poster || movie.backdrop}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {movie.badge && (
                  <span className="px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container font-label-caps text-label-caps font-bold shadow-sm">
                    {movie.badge}
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest/80 text-on-surface font-label-caps text-label-caps backdrop-blur-sm">
                  {movie.qualityBadge || '4K'}
                </span>
              </div>

              {/* Rating */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-secondary text-xs font-bold drop-shadow-md">
                <span className="material-symbols-outlined text-sm icon-filled">star</span>
                <span>{movie.imdbRating || 8.5}</span>
              </div>
            </div>

            <div className="p-space-xs">
              <p className="font-headline-sm text-body-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                {movie.title}
              </p>
              <p className="text-xs text-outline truncate">{movie.genres ? movie.genres.join(' • ') : 'Điện Ảnh'}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
