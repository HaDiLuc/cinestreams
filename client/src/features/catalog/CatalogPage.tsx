import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMovieStore } from '../../stores/useMovieStore';

interface CatalogProps {
  initialType?: 'all' | 'movie' | 'series' | 'anime';
}

export const CatalogPage: React.FC<CatalogProps> = ({ initialType = 'all' }) => {
  const { movies, fetchDynamicMovies } = useMovieStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định thể loại phim từ URL hoặc initialType
  const getTypeFromPath = (path: string): string => {
    if (path.includes('/phim-le')) return 'movie';
    if (path.includes('/phim-bo')) return 'series';
    if (path.includes('/hoat-hinh')) return 'anime';
    if (path.includes('/bo-loc')) return 'all';
    return initialType;
  };

  const [selectedType, setSelectedType] = useState<string>(getTypeFromPath(location.pathname));
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');

  // Lắng nghe thay đổi của URL và props để đồng bộ tức thì khi bấm trên Navbar
  useEffect(() => {
    const nextType = getTypeFromPath(location.pathname);
    setSelectedType(nextType);
    setSelectedGenre('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, initialType]);

  useEffect(() => {
    if (!movies || movies.length === 0) {
      fetchDynamicMovies();
    }
  }, [movies, fetchDynamicMovies]);

  // Chuyển tab và cập nhật URL đồng bộ với Navbar
  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    setSelectedGenre('all');
    if (typeId === 'movie') navigate('/phim-le');
    else if (typeId === 'series') navigate('/phim-bo');
    else if (typeId === 'anime') navigate('/hoat-hinh');
    else navigate('/bo-loc');
  };

  const genres = [
    'Tất cả',
    'Hành Động',
    'Khoa Học Viễn Tưởng',
    'Lịch Sử',
    'Tâm Lý',
    'Kinh Dị',
    'Hoạt Hình',
    'Lãng Mạn'
  ];

  const filtered = movies.filter((m) => {
    if (selectedType !== 'all' && m.type !== selectedType) return false;
    if (selectedGenre !== 'all' && m.genres && !m.genres.includes(selectedGenre)) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'rating') return (b.imdbRating || 0) - (a.imdbRating || 0);
    if (sortBy === 'year') return (b.releaseYear || 0) - (a.releaseYear || 0);
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="w-full max-w-[1920px] mx-auto px-gutter-mobile lg:px-gutter py-space-md space-y-space-md">
      {/* Title & Filter Controls Bar */}
      <div className="p-space-md rounded-2xl bg-surface-container-low border border-surface-variant/30 space-y-space-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
          <div>
            <h1 className="font-headline-lg text-xl lg:text-2xl font-bold text-on-surface">
              {selectedType === 'movie'
                ? 'Kho Phim Lẻ Chiếu Rạp'
                : selectedType === 'series'
                ? 'Kho Phim Bộ Độc Quyền VIP'
                : selectedType === 'anime'
                ? 'Kho Anime & Hoạt Họa'
                : 'Khám Phá Toàn Bộ Kho Phim CineStreams'}
            </h1>
            <p className="text-xs text-outline mt-0.5">Tìm thấy {filtered.length} tác phẩm trong kho lưu trữ</p>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-outline">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-container px-3 py-1.5 rounded-lg border border-surface-variant/40 text-on-surface outline-none focus:border-primary"
            >
              <option value="rating">Điểm IMDb cao nhất</option>
              <option value="year">Năm phát hành mới nhất</option>
              <option value="name">Tên phim A-Z</option>
            </select>
          </div>
        </div>

        {/* Category Types */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Tất Cả Thể Loại' },
            { id: 'movie', label: 'Phim Lẻ' },
            { id: 'series', label: 'Phim Bộ' },
            { id: 'anime', label: 'Hoạt Hình / Anime' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTypeChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedType === tab.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface hover:bg-surface-variant'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Genre Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g === 'Tất cả' ? 'all' : g)}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                (selectedGenre === 'all' && g === 'Tất cả') || selectedGenre === g
                  ? 'bg-tertiary-container/20 text-tertiary font-bold border border-tertiary/30'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Poster Card */}
      {filtered.length === 0 ? (
        <div className="w-full py-16 text-center space-y-2">
          <span className="material-symbols-outlined text-4xl text-outline">movie_off</span>
          <p className="text-sm text-outline">Chưa có tác phẩm nào phù hợp với bộ lọc đã chọn.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-space-sm lg:gap-space-md">
          {filtered.map((movie) => (
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
      )}
    </div>
  );
};
