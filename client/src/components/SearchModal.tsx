import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMovieStore } from '../stores/useMovieStore';
import { Movie } from '../types';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, movies } = useMovieStore();
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [results, setResults] = useState<Movie[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsSearchOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSearchOpen, setIsSearchOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(movies.slice(0, 6));
      return;
    }
    const q = debouncedQuery.toLowerCase();
    const matched = movies.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
        (m.genres && m.genres.some((g) => g.toLowerCase().includes(q))) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.cast && m.cast.some((c) => c.toLowerCase().includes(q)))
    );
    setResults(matched);
  }, [debouncedQuery, movies]);

  if (!isSearchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-surface-container-high border border-surface-variant/50 shadow-2xl overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-surface-variant/40 bg-surface-container">
          <span className="material-symbols-outlined text-primary text-2xl mr-3">search</span>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên phim, diễn viên, thể loại..."
            className="w-full bg-transparent text-on-surface placeholder:text-outline font-body-md text-body-md outline-none border-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-outline hover:text-on-surface mr-2 cursor-pointer"
              title="Xóa nội dung tìm kiếm"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchOpen(false);
            }}
            className="text-xs px-2.5 py-1 rounded-lg bg-surface-container-highest hover:bg-surface-variant text-outline hover:text-on-surface border border-surface-variant/40 transition-colors cursor-pointer flex items-center gap-1 font-mono shadow-sm"
            title="Đóng tìm kiếm (Phím Escape)"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            <span>ESC</span>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">sentiment_dissatisfied</span>
              <p className="text-sm font-semibold text-on-surface">Không tìm thấy phim phù hợp</p>
              <p className="text-xs text-outline mt-1">Thử tìm theo từ khóa như tên phim, 4K, hoặc thể loại</p>
            </div>
          ) : (
            results.map((movie) => (
              <div
                key={movie.id}
                onClick={() => {
                  navigate(`/phim/${movie.slug || movie.id}`);
                  setIsSearchOpen(false);
                }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container transition-colors cursor-pointer group"
              >
                <div className="w-14 aspect-[2/3] rounded-lg overflow-hidden bg-surface-container-highest flex-shrink-0">
                  <img
                    src={movie.poster || movie.backdrop}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                      {movie.title}
                    </p>
                    <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-[10px] text-primary font-bold">
                      {movie.qualityBadge || '4K'}
                    </span>
                  </div>
                  <p className="text-xs text-outline truncate">{movie.genres ? movie.genres.join(', ') : 'Điện Ảnh'}</p>
                  <div className="flex items-center gap-2 text-[11px] text-outline mt-0.5">
                    <span>{movie.releaseYear || 2026}</span>
                    <span>•</span>
                    <span className="flex items-center text-secondary font-bold">
                      <span className="material-symbols-outlined text-xs icon-filled mr-0.5">star</span>
                      {movie.imdbRating || 8.5}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
