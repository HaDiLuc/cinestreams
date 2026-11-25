import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMovieStore } from '../../stores/useMovieStore';
import { useVipStore } from '../../stores/useVipStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useWatchPartyStore } from '../../stores/useWatchPartyStore';
import { apiClient } from '../../services/apiClient';

export const MovieDetailPage: React.FC = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const idOrSlug = id || slug || '';
  const navigate = useNavigate();
  const { toggleWatchlist, watchlist } = useMovieStore();
  const { openPaymentModal } = useVipStore();
  const { currentUser, isAuthenticated } = useAuthStore();

  const isVipUser = Boolean(
    isAuthenticated &&
    currentUser && (
      currentUser.isVip ||
      currentUser.vipTier?.toUpperCase().includes('VIP') ||
      currentUser.roles?.some((r: string) => r.toUpperCase().includes('VIP') || r.toUpperCase().includes('ADMIN'))
    )
  );

  const [movie, setMovie] = useState<any | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Watch Party Modal State
  const { rooms, loadRooms, createRoom } = useWatchPartyStore();
  const [showWatchPartyModal, setShowWatchPartyModal] = useState(false);
  const [watchPartyTab, setWatchPartyTab] = useState<'thisMovie' | 'all'>('thisMovie');
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomMaxCount, setNewRoomMaxCount] = useState(20);
  const [newRoomHostLock, setNewRoomHostLock] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    if (!idOrSlug) {
      setIsLoading(false);
      setLoadError('Không tìm thấy mã phim!');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const fetchDetail = async () => {
      try {
        const res = await apiClient.get<any>(`/movies/${encodeURIComponent(idOrSlug)}`);
        if (!isMounted) return;

        if (res.success && res.data) {
          const fetchedMovie = res.data.movie || res.data;
          let fetchedEpisodes = res.data.episodes || [];

          if (fetchedMovie?.id && (!fetchedEpisodes || fetchedEpisodes.length === 0)) {
            try {
              const epRes = await apiClient.get<any[]>(`/episodes/movie/${fetchedMovie.id}`);
              if (epRes.success && epRes.data) {
                fetchedEpisodes = epRes.data;
              }
            } catch {}
          }

          setMovie(fetchedMovie);
          setEpisodes(fetchedEpisodes);
        } else {
          setLoadError(res.message || 'Không tìm thấy thông tin phim này.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setLoadError(err?.message || 'Lỗi khi tải thông tin phim từ máy chủ.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [idOrSlug]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[70vh] bg-surface-container-lowest text-on-surface space-y-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="font-semibold text-sm text-outline">Đang tải thông tin chi tiết phim...</p>
      </div>
    );
  }

  if (loadError || !movie) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[70vh] bg-surface-container-lowest text-on-surface p-6 text-center space-y-4">
        <span className="material-symbols-outlined text-5xl text-amber-500">warning</span>
        <h2 className="text-xl font-bold">Không tìm thấy phim</h2>
        <p className="text-sm text-outline max-w-md">{loadError || 'Phim không tồn tại hoặc đã bị gỡ bỏ.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm hover:scale-105 transition-all shadow-md"
        >
          Quay về Trang Chủ
        </button>
      </div>
    );
  }

  const isSaved = watchlist.includes(movie.id) || watchlist.includes(movie.slug || '');
  const backdropUrl = movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop';
  const posterUrl = movie.poster || movie.backdrop || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop';

  // Group episodes by season
  const seasonsMap = new Map<number, any[]>();
  if (episodes.length > 0) {
    episodes.forEach((ep) => {
      const sNum = ep.seasonNumber || 1;
      if (!seasonsMap.has(sNum)) {
        seasonsMap.set(sNum, []);
      }
      seasonsMap.get(sNum)!.push(ep);
    });
  } else {
    // Nếu chưa có danh sách tập chi tiết, tạo 1 tập mặc định
    seasonsMap.set(1, [{
      id: movie.id + '-ep1',
      episodeNumber: 1,
      seasonNumber: 1,
      title: movie.title,
      duration: movie.duration || 'Full Movie',
      thumbnail: backdropUrl,
      processStatus: 'COMPLETED'
    }]);
  }

  const seasonNumbers = Array.from(seasonsMap.keys()).sort((a, b) => a - b);
  const currentSeasonEpisodes = seasonsMap.get(selectedSeason) || seasonsMap.get(seasonNumbers[0]) || [];

  const movieRooms = rooms.filter(
    (r) =>
      (movie?.id && (r.movieId === movie.id || r.movieId === movie.slug)) ||
      (movie?.title && r.movieTitle?.toLowerCase().includes(movie.title.toLowerCase())) ||
      (movie?.title && r.title?.toLowerCase().includes(movie.title.toLowerCase()))
  );
  const displayedRooms = watchPartyTab === 'thisMovie' ? movieRooms : rooms;

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVipUser) {
      openPaymentModal();
      return;
    }
    setIsCreatingRoom(true);
    try {
      const room = await createRoom({
        title: newRoomTitle.trim() || `Xem Chung: ${movie?.title || 'Phim CineStreams'}`,
        movieId: movie?.id || 'dune-2',
        movieTitle: movie?.title || 'CineStreams Phim',
        streamUrl: episodes?.[0]?.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        coverImage: movie?.poster || movie?.backdrop,
        maxCount: Number(newRoomMaxCount) || 20,
        hostLock: newRoomHostLock
      }, currentUser);

      if (room && room.id) {
        setShowWatchPartyModal(false);
        navigate(`/watch-party?room=${room.id}`);
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface-container-lowest text-on-surface">
      {/* Cinematic Hero Backdrop */}
      <div className="relative w-full h-[520px] lg:h-[640px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${backdropUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/80 to-transparent lg:w-3/4" />

        {/* Inner Content */}
        <div className="relative h-full max-w-[1920px] mx-auto px-gutter-mobile lg:px-gutter flex flex-col justify-between pt-6 pb-12 z-10">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant flex-wrap">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">home</span>
              <span>Trang Chủ</span>
            </Link>
            <span className="text-outline text-xs">/</span>
            <Link to={`/${movie.type === 'series' ? 'phim-bo' : 'phim-le'}`} className="hover:text-primary transition-colors">
              {movie.type === 'series' ? 'Phim Bộ' : 'Phim Lẻ'}
            </Link>
            <span className="text-outline text-xs">/</span>
            <span className="text-primary font-bold truncate max-w-xs">{movie.title}</span>
          </nav>

          {/* Hero Meta Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-end mt-auto">
            {/* Poster Box */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="relative group rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-surface-container-high border border-surface-variant/40">
                <img src={posterUrl} alt={movie.title} className="aspect-[2/3] w-full object-cover" />
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-secondary-fixed text-label-caps font-label-caps tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">workspace_premium</span>
                    CINESTREAMS
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high/90 backdrop-blur-md text-primary text-label-caps font-label-caps tracking-wider">
                    {movie.qualityBadge || '4K ULTRA HD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Title & Actions */}
            <div className="lg:col-span-9 space-y-space-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary-fixed text-label-caps font-label-caps flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs icon-filled">star</span>
                  IMDb {movie.imdbRating || 8.5}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-xs text-on-surface">
                  {movie.releaseYear || 2026}
                </span>
                <span className="px-2 py-0.5 rounded bg-error-container/40 text-error text-xs font-bold">
                  {movie.ageRating || '16+'}
                </span>
                {movie.qualityBadge && (
                  <span className="px-2 py-0.5 rounded bg-surface-container text-xs text-primary font-bold">
                    {movie.qualityBadge}
                  </span>
                )}
                {movie.audioBadge && (
                  <span className="px-2 py-0.5 rounded bg-surface-container text-xs text-outline font-bold">
                    {movie.audioBadge}
                  </span>
                )}
              </div>

              <h1 className="font-display-hero text-3xl lg:text-5xl font-bold uppercase tracking-tight text-on-surface">
                {movie.title}
              </h1>

              {movie.originalTitle && (
                <p className="text-sm lg:text-base text-outline italic">
                  Tên gốc: {movie.originalTitle}
                </p>
              )}

              <p className="font-body-md text-on-surface-variant max-w-3xl leading-relaxed text-sm lg:text-base">
                {movie.synopsis || 'Nội dung đang được cập nhật...'}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-outline">
                {movie.genres && movie.genres.length > 0 && (
                  <span>Thể loại: <strong className="text-on-surface">{movie.genres.join(', ')}</strong></span>
                )}
                {movie.director && <span>• Đạo diễn: <strong className="text-on-surface">{movie.director}</strong></span>}
                {movie.cast && movie.cast.length > 0 && <span>• Diễn viên: <strong className="text-on-surface">{movie.cast.join(', ')}</strong></span>}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => navigate(`/xem-phim/${movie.slug || movie.id}`)}
                  className="px-6 py-3 rounded-full bg-primary text-on-primary font-bold text-sm flex items-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-2xl icon-filled">play_arrow</span>
                  <span>Xem Phim (Tập 1)</span>
                </button>

                <button
                  onClick={async () => {
                    await loadRooms();
                    setShowCreateInline(false);
                    setShowWatchPartyModal(true);
                  }}
                  className="px-5 py-3 rounded-full bg-surface-container-high/90 hover:bg-surface-bright text-on-surface font-semibold text-sm flex items-center gap-2 backdrop-blur-md transition-all shadow-md hover:scale-105 active:scale-95"
                  title="Xem danh sách các phòng xem chung Watch Party"
                >
                  <span className="material-symbols-outlined text-xl text-tertiary">groups</span>
                  <span>Xem Chung Watch Party</span>
                  <span className="px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                    Live
                  </span>
                </button>

                <button
                  onClick={() => toggleWatchlist(movie.id)}
                  className={`p-3 rounded-full bg-surface-container-high/90 hover:bg-surface-bright flex items-center justify-center transition-all ${
                    isSaved ? 'text-primary' : 'text-on-surface'
                  }`}
                  title="Lưu vào danh sách"
                >
                  <span className={`material-symbols-outlined text-xl ${isSaved ? 'icon-filled' : ''}`}>
                    {isSaved ? 'bookmark_added' : 'bookmark_add'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Season & Episode Selector Section */}
      <div className="w-full max-w-[1920px] mx-auto px-gutter-mobile lg:px-gutter py-space-lg space-y-space-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-variant/30">
          <div className="flex items-center gap-space-sm">
            <span className="w-2.5 h-6 rounded-full bg-primary" />
            <h2 className="font-headline-md text-headline-sm lg:text-headline-md font-bold text-on-surface">
              Danh Sách Tập Phim
            </h2>
            <span className="text-xs text-outline">({currentSeasonEpisodes.length} tập)</span>
          </div>

          {/* Season Selector Tabs nếu có nhiều mùa */}
          {seasonNumbers.length > 1 && (
            <div className="flex items-center gap-2">
              {seasonNumbers.map((sNum) => (
                <button
                  key={sNum}
                  onClick={() => setSelectedSeason(sNum)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedSeason === sNum
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  Mùa {sNum}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Episode Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {currentSeasonEpisodes.map((ep) => (
            <div
              key={ep.id}
              onClick={() => navigate(`/xem-phim/${movie.slug || movie.id}?ep=${ep.episodeNumber}`)}
              className="group rounded-2xl overflow-hidden bg-surface-container shadow-md hover:shadow-xl transition-all duration-300 border border-surface-variant/30 hover:border-primary/50 cursor-pointer"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url('${ep.thumbnail || backdropUrl}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-2xl icon-filled ml-0.5">play_arrow</span>
                  </div>
                </div>

                {/* Duration badge */}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono font-medium text-white">
                  {ep.duration || '45 phút'}
                </span>
              </div>

              <div className="p-space-sm space-y-1">
                <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                  Tập {ep.episodeNumber}: {ep.title || `Tập ${ep.episodeNumber}`}
                </p>
                {ep.synopsis && (
                  <p className="text-xs text-outline line-clamp-2 leading-relaxed">
                    {ep.synopsis}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Watch Party Rooms & Creation */}
      {showWatchPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-surface-container rounded-2xl border border-surface-variant/40 p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-tertiary/15 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">groups</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Phòng Xem Chung Watch Party</h3>
                  <p className="text-xs text-outline truncate max-w-md">Phim: <strong className="text-primary">{movie?.title}</strong></p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWatchPartyModal(false);
                  setShowCreateInline(false);
                }}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-outline hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Filter Tabs & Create Trigger */}
            <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-high text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setWatchPartyTab('thisMovie');
                    setShowCreateInline(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    watchPartyTab === 'thisMovie' && !showCreateInline
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Phòng Phim Này ({movieRooms.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWatchPartyTab('all');
                    setShowCreateInline(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    watchPartyTab === 'all' && !showCreateInline
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Tất Cả Phòng ({rooms.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isVipUser) {
                    openPaymentModal();
                    return;
                  }
                  setNewRoomTitle(`Xem Chung: ${movie?.title || 'Phim'}`);
                  setShowCreateInline(!showCreateInline);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                  showCreateInline
                    ? 'bg-surface-container-highest text-on-surface'
                    : 'bg-gradient-to-r from-secondary to-primary text-surface-container-lowest'
                }`}
              >
                <span className="material-symbols-outlined text-sm font-bold">
                  {showCreateInline ? 'list' : 'add'}
                </span>
                <span>{showCreateInline ? 'Xem Danh Sách' : 'Tạo Phòng Mới'}</span>
                {!isVipUser && !showCreateInline && (
                  <span className="px-1 py-0.2 rounded bg-black/30 text-[9px]">VIP</span>
                )}
              </button>
            </div>

            {/* Inline Create Form or Room List */}
            {showCreateInline ? (
              <form onSubmit={handleCreateRoomSubmit} className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-base">info</span>
                  <span className="font-medium">Bạn đang tạo phòng xem chung cho: <strong>{movie?.title}</strong></span>
                </div>

                <div>
                  <label className="block text-outline font-semibold mb-1">Tên phòng chiếu:</label>
                  <input
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder={`Ví dụ: Xem Chung ${movie?.title} Cùng Bạn Bè`}
                    className="w-full bg-surface-container-high px-3 py-2 rounded-xl text-on-surface outline-none border border-surface-variant/40 focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-outline font-semibold mb-1">Số lượng người xem tối đa:</label>
                  <select
                    value={newRoomMaxCount}
                    onChange={(e) => setNewRoomMaxCount(Number(e.target.value))}
                    className="w-full bg-surface-container-high px-3 py-2 rounded-xl text-on-surface outline-none border border-surface-variant/40 focus:border-primary cursor-pointer"
                  >
                    <option value={5}>5 Người (Thân mật)</option>
                    <option value={10}>10 Người (Tiêu chuẩn)</option>
                    <option value={20}>20 Người (Nhóm bạn VIP)</option>
                    <option value={50}>50 Người (Cộng đồng)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high border border-surface-variant/30">
                  <div>
                    <span className="font-bold text-on-surface block">Khóa quyền điều khiển</span>
                    <span className="text-[11px] text-outline">Chỉ bạn (chủ phòng) mới có quyền Play/Pause/Tua</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newRoomHostLock}
                    onChange={(e) => setNewRoomHostLock(e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateInline(false)}
                    className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-outline hover:text-white font-semibold transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingRoom}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-surface-container-lowest font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-primary/30 transition-all flex items-center gap-1.5"
                  >
                    {isCreatingRoom && <div className="w-3.5 h-3.5 border-2 border-surface-container-lowest border-t-transparent rounded-full animate-spin" />}
                    <span>{isCreatingRoom ? 'Đang Khởi Tạo...' : 'Khởi Tạo Phòng & Vào Xem'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="max-h-[420px] overflow-y-auto space-y-3 flex-1 pr-1">
                {displayedRooms.length === 0 ? (
                  <div className="py-8 px-4 text-center rounded-2xl bg-surface-container-high/60 border border-surface-variant/40 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-3xl">meeting_room</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-on-surface">Chưa Có Phòng Xem Chung Nào Đang Mở</h4>
                      <p className="text-xs text-outline max-w-sm mx-auto leading-relaxed">
                        {watchPartyTab === 'thisMovie'
                          ? `Hiện tại chưa có phòng xem chung nào đang phát phim "${movie?.title}". Hãy tạo phòng đầu tiên để cùng thưởng thức với bạn bè!`
                          : 'Hiện tại chưa có phòng xem chung nào đang hoạt động. Hãy tạo phòng mới ngay!'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isVipUser) {
                          openPaymentModal();
                          return;
                        }
                        setNewRoomTitle(`Xem Chung: ${movie?.title || 'Phim'}`);
                        setShowCreateInline(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-surface-container-lowest font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-lg hover:shadow-primary/30 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">add</span>
                      <span>Tạo Phòng Xem Chung Cho Phim Này</span>
                    </button>
                  </div>
                ) : (
                  displayedRooms.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-surface-container-high border border-surface-variant/30 hover:border-primary/40 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={r.coverImage || movie?.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300'}
                          alt={r.title}
                          className="w-16 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-on-surface truncate">{r.title}</h4>
                          <p className="text-[11px] text-outline truncate">
                            Phim: <span className="text-primary">{r.movieTitle}</span> • Host: {r.hostName}
                          </p>
                          <span className="text-[10px] text-tertiary flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                            {r.activeCount || 1} / {r.maxCount || 20} người đang xem
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowWatchPartyModal(false);
                          navigate(`/watch-party?room=${r.id}`);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shrink-0 hover:bg-primary-fixed-dim transition-colors"
                      >
                        Vào Xem
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Modal Footer Link */}
            <div className="pt-2 border-t border-surface-variant/30 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-outline">Đồng bộ hình ảnh 4K & chat voice thời gian thực</span>
              <button
                type="button"
                onClick={() => {
                  setShowWatchPartyModal(false);
                  navigate('/watch-party');
                }}
                className="text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span>Đến Sảnh Xem Chung</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
