import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useVipStore } from '../../stores/useVipStore';
import { apiClient } from '../../services/apiClient';

interface HlsQualityLevel {
  height: number;
  bitrate: number;
  name: string;
}

export const PlayerPage: React.FC = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const idOrSlug = id || slug || '';
  const [searchParams, setSearchParams] = useSearchParams();
  const epParam = searchParams.get('ep') || '1';
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuthStore();
  const { openPaymentModal } = useVipStore();

  const isVipUser = Boolean(
    isAuthenticated &&
    currentUser && (
      currentUser.isVip ||
      currentUser.vipTier?.toUpperCase().includes('VIP') ||
      currentUser.roles?.some((r: string) => r.toUpperCase().includes('VIP') || r.toUpperCase().includes('ADMIN'))
    )
  );

  // Dynamic Movie & Episode State
  const [movie, setMovie] = useState<any | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    isPlaying,
    setIsPlaying,
    togglePlay,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    quality,
    setQuality,
    audioTrack,
    setAudioTrack,
    subtitleTrack,
    setSubtitleTrack,
    isTheatreMode,
    toggleTheatreMode
  } = usePlayerStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [availableLevels, setAvailableLevels] = useState<HlsQualityLevel[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(-1); // -1 = Auto
  const [showSettings, setShowSettings] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [resumePrompt, setResumePrompt] = useState<{ seconds: number; formatted: string } | null>(null);
  const [subtitleActive, setSubtitleActive] = useState(true);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncHistoryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCountedViewRef = useRef<boolean>(false);

  // ==========================================================
  // PHẦN 1: Nạp Dữ Liệu Động Từ API Theo idOrSlug
  // Tuyệt đối không fallback sang phim Dune demo
  // ==========================================================
  useEffect(() => {
    if (!idOrSlug) {
      setIsLoading(false);
      setLoadError('Không tìm thấy đường dẫn hoặc mã định danh của phim!');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const loadMovieAndEpisodes = async () => {
      try {
        // 1. Gọi API lấy chi tiết phim theo ID hoặc slug
        const res = await apiClient.get<any>(`/movies/${encodeURIComponent(idOrSlug)}`);
        if (!isMounted) return;

        if (res.success && res.data) {
          const fetchedMovie = res.data.movie || res.data;
          let fetchedEpisodes: any[] = res.data.episodes || [];

          // 2. Nếu chưa có episodes từ API chi tiết, gọi thêm API episodes
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

          // 3. Chọn tập phim theo tham số ?ep= hoặc mặc định tập 1
          const targetEpNum = parseInt(epParam, 10) || 1;
          const matched = fetchedEpisodes.find((e: any) => e.episodeNumber === targetEpNum)
            || fetchedEpisodes[0]
            || null;
          setSelectedEpisode(matched);
        } else {
          setLoadError(res.message || 'Không tìm thấy thông tin phim trong cơ sở dữ liệu.');
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

    loadMovieAndEpisodes();
    hasCountedViewRef.current = false;

    return () => {
      isMounted = false;
    };
  }, [idOrSlug, epParam]);

  // Xác định luồng Stream HLS chuẩn xác
  const streamSrc = selectedEpisode?.hlsMasterUrl
    || selectedEpisode?.videoMasterUrl
    || movie?.streamUrl
    || (movie?.id ? `/hls/${movie.id}/hls/master.m3u8` : '');

  // ==========================================================
  // TASK-051 & TASK-055: Tích hợp Hls.js & Khôi phục lỗi mạng
  // ==========================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movie || !streamSrc) return;

    // 1. Kiểm tra mốc xem dở từ Backend
    apiClient.get<any>(`/user/history/${movie.id}`).then((res) => {
      if (res.success && res.data && res.data.currentSeconds > 5) {
        const secs = res.data.currentSeconds;
        const mins = Math.floor(secs / 60);
        const remSecs = Math.floor(secs % 60);
        setResumePrompt({
          seconds: secs,
          formatted: `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`
        });
      }
    }).catch(() => {});

    // 2. Khởi tạo HLS.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        maxBufferLength: 30,
        enableWorker: true
      });
      hlsRef.current = hls;

      hls.loadSource(streamSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels = data.levels.map((lvl) => ({
          height: lvl.height,
          bitrate: lvl.bitrate,
          name: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`
        }));
        setAvailableLevels(levels);

        // Tự động phát khi tải xong luồng HLS nếu trình duyệt cho phép
        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentLevelIndex(data.level);
      });

      // Bắt lỗi đường truyền mạng & tự động retry
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS] Lỗi mạng, đang thử kết nối lại...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Lỗi giải mã media, đang phục hồi...');
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari support
      video.src = streamSrc;
      video.play().catch(() => {
        setIsPlaying(false);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [movie, streamSrc]);

  // ==========================================================
  // TASK-053: Lưu mốc xem dở định kỳ mỗi 10s
  // ==========================================================
  useEffect(() => {
    if (!movie?.id) return;

    syncHistoryTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && video.currentTime > 5) {
        apiClient.post('/user/history', null, {
          params: {
            movieId: movie.id,
            episodeId: selectedEpisode?.id || epParam,
            currentSeconds: Math.floor(video.currentTime),
            totalSeconds: Math.floor(video.duration || duration)
          }
        }).catch(() => {});
      }
    }, 10000);

    return () => {
      if (syncHistoryTimerRef.current) clearInterval(syncHistoryTimerRef.current);
    };
  }, [movie?.id, selectedEpisode?.id, epParam, duration]);

  // Time & Duration sync
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 7200);
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    if (!hasCountedViewRef.current && movie?.id) {
      hasCountedViewRef.current = true;
      apiClient.post(`/movies/${movie.id}/view`).catch(() => {});
    }
  };

  // Video Play/Pause toggler
  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().catch((err) => {
        console.warn('[Player] Không thể phát video:', err);
      });
    } else {
      video.pause();
    }
  };

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
    }
    toggleMute();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    return () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [setIsPlaying, setCurrentTime, setDuration]);

  // Seek handler
  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Quality switch
  const handleQualityChange = (levelIdx: number, label: string) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIdx;
    }
    setCurrentLevelIndex(levelIdx);
    setQuality(label);
    setShowSettings(false);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleTogglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(0, video.currentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(video.duration, video.currentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          video.volume = Math.min(1, volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          video.volume = Math.max(0, volume - 0.1);
          break;
        case 'KeyF':
          e.preventDefault();
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
        case 'KeyC':
          e.preventDefault();
          setSubtitleActive((prev) => !prev);
          break;
        case 'KeyT':
          e.preventDefault();
          toggleTheatreMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, togglePlay, toggleTheatreMode]);

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        setControlsVisible(false);
      }
    }, 3500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ==========================================================
  // Trạng Thái Đang Tải (Spinner Loading)
  // ==========================================================
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[85vh] bg-black text-white space-y-4">
        <div className="w-14 h-14 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="font-semibold text-sm tracking-wide text-zinc-300">
          Đang nạp dữ liệu phim và luồng phát HLS 4K...
        </p>
      </div>
    );
  }

  // ==========================================================
  // Trạng Thái Lỗi (Không Tìm Thấy Phim)
  // ==========================================================
  if (loadError || !movie) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[85vh] bg-black text-white p-6 text-center space-y-4">
        <span className="material-symbols-outlined text-5xl text-amber-500">warning</span>
        <h2 className="text-xl font-bold">Không thể phát phim</h2>
        <p className="text-sm text-zinc-400 max-w-md">
          {loadError || 'Không tìm thấy dữ liệu phim trong hệ thống CineStreams.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold text-sm hover:scale-105 transition-all shadow-lg"
        >
          Quay về Trang Chủ
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full bg-black flex flex-col justify-center select-none overflow-hidden ${
        isTheatreMode ? 'h-screen' : 'min-h-[85vh]'
      }`}
    >
      {/* Video Canvas với Hls.js thực tế */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handleVideoPlay}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onClick={handleTogglePlay}
          poster={movie.backdrop || movie.poster}
          className="w-full h-full object-contain max-h-[92vh] cursor-pointer"
          playsInline
        >
          {subtitleActive && (
            <track
              kind="subtitles"
              src={`/hls/${movie.id}/subs/sub_vi.vtt`}
              srcLang="vi"
              label="Tiếng Việt (Vietsub)"
              default
            />
          )}
        </video>

        {/* Ambient Overlay for UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

        {/* Resume Playback Toast Prompt (TASK-053) */}
        {resumePrompt && (
          <div className="absolute top-20 left-6 z-40 bg-surface-container-high/95 backdrop-blur-xl border border-primary/40 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-fade-in">
            <span className="material-symbols-outlined text-primary text-2xl">history</span>
            <div className="text-xs">
              <p className="font-bold text-white">Bạn đang xem dở ở mốc {resumePrompt.formatted}</p>
              <p className="text-zinc-400">Tiếp tục từ đoạn đã xem trước đó?</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleSeek(resumePrompt.seconds);
                  setResumePrompt(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90"
              >
                Tiếp tục
              </button>
              <button
                onClick={() => setResumePrompt(null)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Center Play Button indicator */}
        {!isPlaying && (
          <button
            onClick={handleTogglePlay}
            className="absolute z-20 w-20 h-20 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.8)] hover:scale-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-5xl icon-filled ml-1">play_arrow</span>
          </button>
        )}

        {/* Top Overlay Bar */}
        <div
          className={`absolute top-0 left-0 right-0 p-4 lg:p-6 flex items-center justify-between z-30 transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition-colors"
              title="Quay lại"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h2 className="font-bold text-white text-base lg:text-lg flex items-center gap-2">
                <span>{movie.title}</span>
                {selectedEpisode ? (
                  <span className="text-primary text-xs px-2 py-0.5 rounded bg-primary/20 font-mono font-bold">
                    Tập {selectedEpisode.episodeNumber}
                    {selectedEpisode.title ? `: ${selectedEpisode.title}` : ''}
                  </span>
                ) : (
                  <span className="text-primary text-xs px-2 py-0.5 rounded bg-primary/20 font-mono font-bold">
                    Tập {epParam}
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                Đang phát HLS Adaptive Bitrate • {quality || 'Auto'} • Phím tắt: Space (Phát/Dừng), F (Toàn màn hình), C (Sub)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bộ chọn tập nhanh nếu có nhiều tập */}
            {episodes.length > 1 && (
              <div className="hidden md:flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 max-w-xs overflow-x-auto">
                {episodes.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setSelectedEpisode(ep);
                      setSearchParams({ ep: ep.episodeNumber.toString() });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      (selectedEpisode?.id === ep.id || ep.episodeNumber === parseInt(epParam, 10))
                        ? 'bg-primary text-on-primary'
                        : 'text-zinc-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Tập {ep.episodeNumber}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                navigate(`/watch-party?movieId=${movie?.id || 'dune-2'}&movieTitle=${encodeURIComponent(movie?.title || '')}&time=${Math.floor(videoRef.current?.currentTime || 0)}`);
              }}
              className="px-3 py-1.5 rounded-full bg-surface-container-high/80 text-tertiary hover:bg-surface-container font-label-md text-xs flex items-center gap-1.5"
              title="Phòng Xem Chung Watch Party"
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              <span>Watch Party</span>
              {!isVipUser && (
                <span className="px-1 py-0.2 rounded bg-secondary/20 text-secondary text-[9px] font-bold">
                  VIP 👑
                </span>
              )}
            </button>
            <span className="px-2 py-1 rounded bg-secondary-container/30 text-secondary-fixed text-xs font-bold font-mono">
              {currentLevelIndex === -1 ? 'AUTO' : availableLevels[currentLevelIndex]?.name || '4K'}
            </span>
          </div>
        </div>

        {/* Bottom Overlay Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 lg:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-30 transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Seek Progress Bar */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              handleSeek(percent * (duration || 1));
            }}
            className="relative w-full h-1.5 hover:h-2.5 bg-zinc-700/80 rounded-full cursor-pointer mb-4 transition-all group"
          >
            <div
              className="bg-primary h-full rounded-full relative"
              style={{ width: `${((currentTime || 0) / (duration || 1)) * 100}%` }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md scale-0 group-hover:scale-100 transition-transform" />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
              >
                <span className="material-symbols-outlined text-2xl icon-filled">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>

              <button
                onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Lùi 10s (←)"
              >
                <span className="material-symbols-outlined text-xl">replay_10</span>
              </button>

              <button
                onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Tới 10s (→)"
              >
                <span className="material-symbols-outlined text-xl">forward_10</span>
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-2">
                <button onClick={handleToggleMute} className="p-1 hover:text-primary">
                  <span className="material-symbols-outlined text-xl">
                    {isMuted ? 'volume_off' : volume > 0.5 ? 'volume_up' : 'volume_down'}
                  </span>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (videoRef.current) videoRef.current.volume = val;
                  }}
                  className="w-16 lg:w-24 h-1 bg-zinc-600 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* Timestamps */}
              <div className="text-xs text-zinc-300 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span className="mx-1 text-zinc-500">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Subtitle Toggle (Phím C) */}
              <button
                onClick={() => setSubtitleActive(!subtitleActive)}
                className={`p-2 rounded-full transition-colors ${
                  subtitleActive ? 'text-primary bg-primary/20' : 'text-zinc-400 hover:text-white'
                }`}
                title="Bật/Tắt Phụ Đề (Phím C)"
              >
                <span className="material-symbols-outlined text-xl">closed_caption</span>
              </button>

              {/* Settings Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-full transition-colors ${
                    showSettings ? 'text-primary bg-white/20' : 'hover:bg-white/20 text-white'
                  }`}
                  title="Cài đặt phát lại"
                >
                  <span className="material-symbols-outlined text-xl">settings</span>
                </button>

                {showSettings && (
                  <div className="absolute right-0 bottom-full mb-3 w-64 rounded-2xl bg-surface-container-high/95 backdrop-blur-2xl border border-surface-variant/40 shadow-2xl p-3 text-xs space-y-3 z-40 text-on-surface">
                    <div>
                      <p className="text-outline font-semibold mb-1">Chất Lượng Video (HLS ABR)</p>
                      <button
                        onClick={() => handleQualityChange(-1, 'Tự Động (ABR)')}
                        className={`w-full text-left px-2 py-1.5 rounded transition-colors flex items-center justify-between ${
                          currentLevelIndex === -1 ? 'text-primary bg-primary/20 font-bold' : 'hover:bg-surface-variant'
                        }`}
                      >
                        <span>Tự Động (Auto Bitrate)</span>
                        {currentLevelIndex === -1 && <span className="material-symbols-outlined text-xs">check</span>}
                      </button>

                      {availableLevels.map((lvl, idx) => (
                        <button
                          key={lvl.name + idx}
                          onClick={() => handleQualityChange(idx, lvl.name)}
                          className={`w-full text-left px-2 py-1.5 rounded transition-colors flex items-center justify-between ${
                            currentLevelIndex === idx ? 'text-primary bg-primary/20 font-bold' : 'hover:bg-surface-variant'
                          }`}
                        >
                          <span>{lvl.name}</span>
                          {currentLevelIndex === idx && <span className="material-symbols-outlined text-xs">check</span>}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-surface-variant/30 pt-2">
                      <p className="text-outline font-semibold mb-1">Âm Thanh</p>
                      {['Tiếng Việt (Lồng tiếng chuẩn rạp 5.1)', 'Tiếng Anh (Original Atmos)'].map((a) => (
                        <button
                          key={a}
                          onClick={() => setAudioTrack(a)}
                          className={`w-full text-left px-2 py-1.5 rounded transition-colors flex items-center justify-between ${
                            audioTrack === a ? 'text-primary bg-primary/20 font-bold' : 'hover:bg-surface-variant'
                          }`}
                        >
                          <span className="truncate">{a}</span>
                          {audioTrack === a && <span className="material-symbols-outlined text-xs">check</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Theatre Mode (Phím T) */}
              <button
                onClick={toggleTheatreMode}
                className="p-2 rounded-full hover:bg-white/20 transition-colors hidden sm:block"
                title="Chế độ rạp chiếu (Phím T)"
              >
                <span className="material-symbols-outlined text-xl">
                  {isTheatreMode ? 'fit_screen' : 'tv'}
                </span>
              </button>

              {/* Fullscreen (Phím F) */}
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    containerRef.current?.requestFullscreen();
                  } else {
                    document.exitFullscreen();
                  }
                }}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Toàn màn hình (Phím F)"
              >
                <span className="material-symbols-outlined text-xl">fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
