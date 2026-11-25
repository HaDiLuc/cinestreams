import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { useWatchPartyStore } from '../../stores/useWatchPartyStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useVipStore } from '../../stores/useVipStore';
import { useMovieStore } from '../../stores/useMovieStore';
import { watchPartySocket } from '../../services/socketService';
import { HERO_MOVIES, ALL_MOVIES } from '../../data/moviesData';

const WATCH_PARTY_MOVIES = [
  {
    id: 'dune-2',
    title: 'Dune: Hành Tinh Cát - Phần 2',
    type: 'movie',
    duration: '2g 46p',
    quality: '4K DOLBY ATMOS',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN2LMdr7k6t28pixcqtV_DU65R9YZc6w1Fa_ofgP4IwbnJCRwg4sKZs9nvQ40M0rQPiGuXT_whrQdyb2iltXdCebb-KJylFIFvezB82DegiDGQyGgkTY98eVWk2seEB3-zres6kWJn-SZG_yTH0x0oPrzHFeDIkA6g2zyAlSE5qVt9uHONADDErNAaIEAn92dssTytRm4AFrQAfOeIvPpapO6-EbMVeGb1VJ_UXDyWlKXs68gnjWjb3w',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  },
  {
    id: 'oppenheimer',
    title: 'Oppenheimer',
    type: 'movie',
    duration: '3g 00p',
    quality: 'IMAX 70MM 4K',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuG3txMZplmamoKp2e9nRbwOyR9jS12jeDZuTNiqg-V9gcwC7KEmAo5jwkIAR6LEPIL5zrkWkx1Te6QYoKBLDvyXQ9NU0XKcXASaziWS9XoNGw1gxEJpmC0YSssjjNNnbkM9l4-xH_OKkI6IEqS5QJFpNSfO54GBuQvYyGbH9viRRvJ83f5l8ri3J1Eh7DFrWYiV0hqbKXcl4jDVUo7SX36hpGlcuANFHwvkqy5mHXV8WsG3tKcp8CZg',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  },
  {
    id: 'arcane-s2',
    title: 'Arcane: Liên Minh Huyền Thoại (Mùa 2)',
    type: 'series',
    quality: '4K DOLBY VISION',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAR5oxnZ56nHvn2-epNkm2CKNARcT18xmvEbtly9yRwjAR4MOVRn80bhIFSUeYLGZS6RYd7KeXJBiPCjactmHV9gwJiDqEW3KlnOgsuMqL916am46nqWMvI8_v7z0ir29LS-5jy-z-o2wcrmE6Aad6NFqt9Q62o4gSY9ARnO00FXGXIFg0HjjPUmrH0_5edw5jhzDoab83CVqVMknsiiHzgxFmInRcC15N6j96h8Opzj-cg_YA7BNvQqQ',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    episodes: [
      { ep: 1, title: 'Tập 1: Cơn Thịnh Nộ Của Zaun', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
      { ep: 2, title: 'Tập 2: Ký Ức Đau Thương', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
      { ep: 3, title: 'Tập 3: Ngọn Lửa Khởi Nghĩa', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
      { ep: 4, title: 'Tập 4: Liên Minh Thắt Chặt', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
      { ep: 5, title: 'Tập 5: Đối Đầu Piltover', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' }
    ]
  },
  {
    id: 'shogun',
    title: 'Shōgun: Tướng Quân Huyền Thoại',
    type: 'series',
    quality: '4K HDR10+',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7-wL8LrUnuoTiNLWfNnXv4PvNfbOBUxGSaTr21I63EwyrGugAcicTKLmPAbjkrUuyxTP3HI3naHjEVsX6UdS-24f3MPULpW2qtuSfHJcotyX5vorAG8cMlfNEVWsgFMGOny9VJPnwQEzPBShilw_qmT8X4b-4ccVvf_Sbvboz2LMjiUun3Zdb6cYaJjy9nY8aIFSFB3tPbShCYWEOWiB002WSZWPSmeUhH1CTNQkFCpcJ2158EDczEA',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    episodes: [
      { ep: 1, title: 'Tập 1: Thế Cờ Khởi Đầu', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
      { ep: 2, title: 'Tập 2: Kẻ Thù Vô Hình', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
      { ep: 3, title: 'Tập 3: Hàng Rào Phòng Thủ', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
      { ep: 4, title: 'Tập 4: Hồi Trống Chiến Trận', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' }
    ]
  },
  {
    id: 'lat-mat-7',
    title: 'Lật Mặt 7: Một Điều Ước',
    type: 'movie',
    duration: '2g 18p',
    quality: '4K UHD Siêu Nét',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrSXiDwAvjoRc5KI7fdzGeyD7lnX9tWHcOKuXNMnVyI6ooYrnVfHChl_zr0OeyE89sNv3XT7SMyl4uiXY0kyEE-KQzOtceeQc74Pxz15Ui3wyOn0OeDPO13T3ai8Kph5TLvNKzKeGuosmtEU7ueIArOt_UkEqavBEMCikjbO7WA5fqZRyUDS_RQO6YZWbKJodO8x4TWfDJHg_HJ1wISn3G7OV_UKCGyM_uhhdBIGM57exPmV83g9kRKQ',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
  },
  {
    id: 'mai',
    title: 'Mai (Bản Đạo Diễn Full)',
    type: 'movie',
    duration: '2g 11p',
    quality: 'Bản Gốc 4K',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHdB731ChKL3UG94NMgHtrvk6wtR3wxGxvjw5idocq5Sog6XZqROtTGxV-2vQl0Gpj1t4kQr9JE0ay8JsKtzcvTymlVPRK5s54fWOUVNh1i5Az4fMOliKf1_m0QXoLcgT2LyguETKOPmB31umOLubt7SGi7Uyj8jxhg4sSJ8iIbzaLCDMT4i-HLZeCNH7M6gS_VFdxV1fopx30XvyipHDft3iIQQ0c012A1iUS5AZpb9fEO02kFRpsXg',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4'
  },
  {
    id: 'queen-of-tears',
    title: 'Nữ Hoàng Nước Mắt (Queen of Tears)',
    type: 'series',
    duration: '16 Tập',
    quality: 'Full HD Vietsub',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7yxN5ewpgI-LF5lzrpjDcYQ26rlzopniWxn-en_ZjAKg7U7nh1LkHEIO4JIKDoIn_lL1UdyYdrMO51Zixqzk_sAYHTth2nskeThNPS17r1FFHt6LitFzmYj0H-7NiScQoAwHY6CjKnHRZwoZoq9ejfAonM55e3xHCtWdqdgaICuWs8BCts9vE5vUzoxSmaJfh47ek5KZvnFwxea0xlXKLjUnGmyIJl0eiyA1o2FVoIkzMhLM1UYIs0w',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    episodes: [
      { ep: 1, title: 'Tập 1: Định Mệnh Hôn Nhân', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4' },
      { ep: 2, title: 'Tập 2: Bí Mật Tập Đoàn', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
    ]
  },
  {
    id: 'godzilla-x-kong',
    title: 'Godzilla x Kong: Đế Chế Mới',
    type: 'movie',
    duration: '1g 55p',
    quality: '4K HDR10+',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnjw6p96UuvEbFvurZkqmJ3V73o75nIlNOXlMAgcSWozGNY7RbQV6m1WfznXvCtEqYgB2NGlQ3y9guI_2DnmZJ9zvhh_1MRu24QXRj6UsC7xltD73GBHG9Q-LMiS30yTZ9ylhZUpGKMpF9LWBqPAv79q7pO0Gq9wvqPbi3JfTlrWv501SKUUVDq9IbGpgXrde6IpiBjo0YP2RkIC7WUQGfVI6UZnTod0lKhmZXZ0dQGuzwbLN7j8u8vA',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4'
  },
  {
    id: 'demon-slayer-hashira',
    title: 'Thanh Gươm Diệt Quỷ: Đại Trụ Huấn Luyện',
    type: 'series',
    quality: '4K Anime VIP',
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzVllojHU70op7I17Yt-wIJeDFMYW2sD-SgagbC8Mifh6ry3p0_e3Ufo2G3MffI26LmJxpAq1Wf27t489ZYglv7cRQhSBFAxRoWMUbz2HTe4M_ADRrnDazWPLzOQzBIT80DUzXWM4DnBPdY1yQXos0B8PWGeFEGZdJF2_mlvIkEolVg8Y0bLMiRmfCXAdDplgT5-5OPOi6V3NpWN_b4_qXoBnlEIwxn5GSbBrYyFvgR6MKgr7TgBF3aQ',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    episodes: [
      { ep: 1, title: 'Tập 1: Thử Thách Của Âm Trụ', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
      { ep: 2, title: 'Tập 2: Kiếm Khí Vô Hạn', streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' }
    ]
  },
  {
    id: 'your-name',
    title: 'Your Name (Tên Cậu Là Gì?)',
    type: 'movie',
    duration: '1g 47p',
    quality: 'Full HD 1080p',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4'
  }
];

const formatTime = (secs: number) => {
  if (isNaN(secs)) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const WatchPartyPage: React.FC = () => {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const [searchParams] = useSearchParams();
  const queryRoom = searchParams.get('room');
  const queryMovie = searchParams.get('movieId');
  const queryMovieTitle = searchParams.get('movieTitle');
  const queryAction = searchParams.get('action');
  const navigate = useNavigate();

  const activeRoomId = paramRoomId || queryRoom;
  const [lobbySearchQuery, setLobbySearchQuery] = useState('');
  const [lobbyMovieFilter, setLobbyMovieFilter] = useState<string | null>(queryMovie || null);

  const { currentUser, isAuthenticated } = useAuthStore();
  const { openPaymentModal } = useVipStore();
  const {
    currentRoom,
    rooms,
    chatMessages,
    participants,
    reactions,
    isPlaying,
    currentTime,
    duration,
    isHost,
    hostLock,
    isMicMuted,
    latencyMs,
    pinnedMessage,
    activeSideTab,
    loadRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    closeRoom,
    sendPlay,
    sendPause,
    sendSeek,
    sendSyncBeacon,
    sendMessage,
    triggerReaction,
    toggleMic,
    toggleHostLock,
    changeMovie,
    setActiveSideTab,
    setCurrentTimeLocal,
    setDurationLocal,
    isRoomClosed,
    roomClosedReason,
    resetRoomClosed
  } = useWatchPartyStore();

  const [inputMsg, setInputMsg] = useState('');
  const [isSpoilerMsg, setIsSpoilerMsg] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [showRoomBrowser, setShowRoomBrowser] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChangeMovieModal, setShowChangeMovieModal] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [syncAlert, setSyncAlert] = useState<string | null>(null);

  const triggerSyncToast = (msg: string) => {
    setSyncAlert(msg);
    setTimeout(() => setSyncAlert(null), 4000);
  };

  // Phân quyền VIP: Chỉ người dùng VIP mới có quyền tạo phòng xem chung
  const isVipUser = Boolean(
    isAuthenticated &&
    currentUser && (
      currentUser.isVip ||
      currentUser.vipTier?.toUpperCase().includes('VIP') ||
      currentUser.roles?.some((r: string) => r.toUpperCase().includes('VIP') || r.toUpperCase().includes('ADMIN'))
    )
  );

  const storeMovies = useMovieStore((s) => s.movies);

  // Danh mục tổng hợp tất cả phim có trên web CineStreams
  const allWebMovies = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Nạp danh sách phim có sẵn luồng stream chuyên biệt cho Watch Party trước
    WATCH_PARTY_MOVIES.forEach((m) => {
      map.set(m.id, {
        ...m,
        poster: m.coverImage,
        backdrop: m.coverImage,
        qualityBadge: m.quality || '4K ULTRA HD',
        releaseYear: 2024
      });
    });

    // 2. Nạp toàn bộ phim từ web (ALL_MOVIES và MongoDB dynamic store)
    const combined = [...(storeMovies || []), ...ALL_MOVIES];
    combined.forEach((m) => {
      const existing = map.get(m.id);
      if (existing) {
        map.set(m.id, {
          ...m,
          ...existing,
          title: m.title || existing.title,
          coverImage: existing.coverImage || m.backdrop || m.poster,
          streamUrl: existing.streamUrl || m.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
        });
      } else {
        const defaultStream = m.streamUrl || (m.type === 'series'
          ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');

        map.set(m.id, {
          id: m.id,
          title: m.title,
          originalTitle: m.originalTitle,
          type: m.type,
          duration: m.duration || (m.type === 'series' ? 'Nhiều tập' : '2 giờ'),
          quality: m.qualityBadge || '4K ULTRA HD',
          qualityBadge: m.qualityBadge || '4K ULTRA HD',
          coverImage: m.backdrop || m.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',
          backdrop: m.backdrop || m.poster,
          poster: m.poster || m.backdrop,
          releaseYear: m.releaseYear || 2024,
          genres: m.genres || [],
          director: m.director,
          imdbRating: m.imdbRating,
          streamUrl: defaultStream,
          episodes: m.seasons?.[0]?.episodes?.map((ep, idx) => ({
            ep: ep.episodeNumber || idx + 1,
            title: ep.title || `Tập ${idx + 1}`,
            streamUrl: ep.streamUrl || defaultStream
          }))
        });
      }
    });

    return Array.from(map.values());
  }, [storeMovies]);

  // Bộ lọc tìm phim khi Tạo Phòng
  const [createRoomSearchQuery, setCreateRoomSearchQuery] = useState('');
  const createFilteredMovies = useMemo(() => {
    const q = createRoomSearchQuery.trim().toLowerCase();
    if (!q) return allWebMovies;
    return allWebMovies.filter((m) =>
      m.title?.toLowerCase().includes(q) ||
      m.originalTitle?.toLowerCase().includes(q) ||
      m.genres?.some((g: string) => g.toLowerCase().includes(q)) ||
      m.director?.toLowerCase().includes(q)
    );
  }, [allWebMovies, createRoomSearchQuery]);

  // Bộ lọc tìm phim khi Đổi Phim trong phòng
  const [changeMovieSearchQuery, setChangeMovieSearchQuery] = useState('');
  const changeFilteredMovies = useMemo(() => {
    const q = changeMovieSearchQuery.trim().toLowerCase();
    if (!q) return allWebMovies;
    return allWebMovies.filter((m) =>
      m.title?.toLowerCase().includes(q) ||
      m.originalTitle?.toLowerCase().includes(q) ||
      m.genres?.some((g: string) => g.toLowerCase().includes(q)) ||
      m.director?.toLowerCase().includes(q)
    );
  }, [allWebMovies, changeMovieSearchQuery]);

  const handleOpenCreateModal = () => {
    if (!isVipUser) {
      triggerSyncToast('Tính năng Tạo phòng xem chung (Watch Party) chỉ dành riêng cho thành viên VIP. Vui lòng nâng cấp gói VIP!');
      openPaymentModal();
      return;
    }
    setCreateRoomSearchQuery('');
    setShowCreateModal(true);
  };

  // Change movie/episode state for host & room controls
  const [movieChangeTab, setMovieChangeTab] = useState<'catalog' | 'custom'>('catalog');
  const [selectedChangeMovieId, setSelectedChangeMovieId] = useState('dune-2');
  const [selectedChangeEpisodeIndex, setSelectedChangeEpisodeIndex] = useState(0);
  const [customMovieName, setCustomMovieName] = useState('');
  const [customStreamInput, setCustomStreamInput] = useState('');
  const [customCoverInput, setCustomCoverInput] = useState('');

  // Phân quyền đổi phim: Chủ phòng (isHost hoặc trùng ID/tên) hoặc phòng không khóa tua (!hostLock)
  const canChangeMovie =
    isHost ||
    Boolean(
      currentRoom &&
      currentUser &&
      (currentRoom.hostId === currentUser.id ||
        currentRoom.hostName === (currentUser.username || currentUser.name))
    ) ||
    !hostLock;

  const handleOpenChangeMovieModal = () => {
    if (currentRoom?.movieId) {
      setSelectedChangeMovieId(currentRoom.movieId);
    }
    setSelectedChangeEpisodeIndex(0);
    setChangeMovieSearchQuery('');
    setShowChangeMovieModal(true);
  };

  // Create room form state
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState(queryMovie || 'dune-2');
  const [newRoomMaxCount, setNewRoomMaxCount] = useState(20);
  const [newRoomHostLock, setNewRoomHostLock] = useState(true);

  // Video and container refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const chatFeedRef = useRef<HTMLDivElement | null>(null);
  const isInternalSeeking = useRef(false);

  // Active room ID calculation
  const targetRoomId = activeRoomId;

  // 1. Initial Load & Join Room
  useEffect(() => {
    loadRooms();
    if (activeRoomId) {
      joinRoom(activeRoomId, currentUser);
    }

    return () => {
      if (activeRoomId) {
        leaveRoom(currentUser);
      }
    };
  }, [activeRoomId]);

  // Handle action=create or search param create=true
  useEffect(() => {
    if (queryAction === 'create' || searchParams.get('create') === 'true') {
      if (queryMovie) {
        setSelectedMovieId(queryMovie);
      }
      setShowCreateModal(true);
    }
  }, [queryAction, searchParams]);

  // 2. Setup Video Element & Hls.js
  useEffect(() => {
    if (!activeRoomId) return;
    const video = videoRef.current;
    if (!video || !currentRoom) return;

    const streamSrc = currentRoom.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

    // Dừng video cũ trước khi nạp phim mới
    video.pause();

    if (Hls.isSupported() && streamSrc.includes('.m3u8')) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(streamSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (currentTime > 0) {
          video.currentTime = currentTime;
        } else {
          video.currentTime = 0;
        }
        if (isPlaying) {
          video.play().catch(() => { });
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.src = streamSrc;
      video.load();
      if (currentTime > 0) {
        video.currentTime = currentTime;
      } else {
        video.currentTime = 0;
      }
      if (isPlaying) {
        video.play().catch(() => { });
      }
    }
  }, [activeRoomId, currentRoom?.id, currentRoom?.movieId, currentRoom?.movieTitle, currentRoom?.streamUrl]);

  // 3. React to Store State Changes (Play/Pause/Seek sync from remote peers)
  useEffect(() => {
    if (!activeRoomId) return;
    const video = videoRef.current;
    if (!video) return;

    // Sync play/pause
    if (isPlaying && video.paused) {
      video.play().catch(() => { });
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }

    // Sync time if drift > 1.2s
    if (Math.abs(video.currentTime - currentTime) > 1.2 && !isInternalSeeking.current) {
      video.currentTime = currentTime;
    }
  }, [activeRoomId, isPlaying, currentTime]);

  // 4. Host Periodic Heartbeat Beacon
  useEffect(() => {
    if (!activeRoomId || !isHost) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        sendSyncBeacon(video.currentTime, !video.paused);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeRoomId, isHost]);

  // 5. Cuộn khung chat nội bộ (KHÔNG cuộn toàn bộ màn hình trình duyệt)
  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  // 6. Listen for Room Closed Event (Host closed room -> kick all participants)
  useEffect(() => {
    if (isRoomClosed) {
      triggerSyncToast(roomClosedReason || 'Chủ phòng đã thoát và đóng phòng xem chung. Đang chuyển về danh sách phòng...');
      const timer = setTimeout(() => {
        resetRoomClosed();
        navigate('/watch-party');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRoomClosed]);

  // 7. Socket.IO Real-time Sync Event Listeners for Player Actions
  useEffect(() => {
    if (!activeRoomId) return;
    const socket = watchPartySocket.getSocket();
    if (!socket) return;

    const handleSyncPlay = (data: any) => {
      const senderName = data.user?.name || data.sender || 'Người xem';
      if (data.user?.id !== currentUser?.id) {
        triggerSyncToast(`⚡ [Socket.IO] ${senderName} đã phát tiếp video tại ${formatTime(data.currentTime)}`);
      }
    };

    const handleSyncPause = (data: any) => {
      const senderName = data.user?.name || data.sender || 'Người xem';
      if (data.user?.id !== currentUser?.id) {
        triggerSyncToast(`⏸️ [Socket.IO] ${senderName} đã tạm dừng video`);
      }
    };

    const handleSyncSeek = (data: any) => {
      const senderName = data.user?.name || data.sender || 'Người xem';
      if (data.user?.id !== currentUser?.id) {
        triggerSyncToast(`⏩ [Socket.IO] ${senderName} đã tua video đến ${formatTime(data.currentTime)}`);
      }
    };

    socket.on('sync_play', handleSyncPlay);
    socket.on('sync_pause', handleSyncPause);
    socket.on('sync_seek', handleSyncSeek);

    return () => {
      socket.off('sync_play', handleSyncPlay);
      socket.off('sync_pause', handleSyncPause);
      socket.off('sync_seek', handleSyncSeek);
    };
  }, [activeRoomId, targetRoomId, currentUser?.id]);

  const handleConfirmLeave = async () => {
    setShowLeaveConfirmModal(false);
    if (isHost) {
      await closeRoom(currentUser);
    } else {
      leaveRoom(currentUser);
    }
    navigate('/watch-party');
  };

  // Handlers
  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (hostLock && !isHost) {
      triggerSyncToast('Chủ phòng đang khóa điều khiển. Video tự động đồng bộ theo chủ phòng.');
      return;
    }

    if (video.paused) {
      video.play().catch(() => { });
      sendPlay(video.currentTime, currentUser);
    } else {
      video.pause();
      sendPause(video.currentTime, currentUser);
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    if (hostLock && !isHost) {
      triggerSyncToast('Chủ phòng đang khóa quyền tua. Bạn có thể bấm "Đồng Bộ Lại" để khớp mốc xem.');
      return;
    }

    isInternalSeeking.current = true;
    video.currentTime = newTime;
    setCurrentTimeLocal(newTime);
    sendSeek(newTime, currentUser);
    setTimeout(() => {
      isInternalSeeking.current = false;
    }, 500);
  };

  const handleSkipTime = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 3600, video.currentTime + deltaSeconds));
    handleSeek(target);
  };

  const handleResync = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = currentTime;
    if (isPlaying && video.paused) {
      video.play().catch(() => { });
    }
    triggerSyncToast(`Đã đồng bộ lại hoàn tất với Chủ Phòng tại mốc ${formatTime(currentTime)}!`);
  };

  const handleCopyLink = () => {
    const url = window.location.origin + `/watch-party?room=${currentRoom?.id || 'room-dune-2'}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 3000);
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    sendMessage(inputMsg, isSpoilerMsg, currentUser);
    setInputMsg('');
    setIsSpoilerMsg(false);
  };

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVipUser) {
      setShowCreateModal(false);
      triggerSyncToast('Tính năng Tạo phòng xem chung (Watch Party) chỉ dành riêng cho thành viên VIP. Vui lòng nâng cấp VIP!');
      openPaymentModal();
      return;
    }

    const movie = allWebMovies.find((m) => m.id === selectedMovieId) || allWebMovies[0];
    const roomTitleToCreate = newRoomTitle.trim() || `Phòng xem: ${movie.title}`;

    // 1. Tắt ngay modal tạo phòng và reset input
    setShowCreateModal(false);
    setNewRoomTitle('');

    try {
      const room = await createRoom({
        title: roomTitleToCreate,
        movieId: movie.id,
        movieTitle: movie.title,
        streamUrl: movie.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        coverImage: movie.backdrop || movie.poster || movie.coverImage,
        maxCount: Number(newRoomMaxCount) || 20,
        hostLock: newRoomHostLock
      }, currentUser);

      if (room && room.id) {
        triggerSyncToast(`Đã khởi tạo phòng xem chung [${room.title}] thành công!`);
        navigate(`/watch-party?room=${room.id}`);
      }
    } catch (_err) {
      triggerSyncToast('Có lỗi xảy ra khi tạo phòng. Vui lòng thử lại!');
    }
  };

  const handleChangeMovieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (movieChangeTab === 'custom') {
      if (!customMovieName.trim() || !customStreamInput.trim()) return;
      await changeMovie({
        movieId: 'custom-' + Date.now().toString().slice(-4),
        movieTitle: customMovieName.trim(),
        streamUrl: customStreamInput.trim(),
        coverImage: customCoverInput.trim() || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200'
      }, currentUser);
      triggerSyncToast(`Đã chuyển sang phim tùy chỉnh: [${customMovieName.trim()}] cho toàn phòng!`);
    } else {
      const selected = allWebMovies.find((m) => m.id === selectedChangeMovieId) || allWebMovies[0];
      let epTitle: string | undefined = undefined;
      let targetStream = selected.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
      if (selected.episodes && selected.episodes.length > 0) {
        const ep = selected.episodes[selectedChangeEpisodeIndex] || selected.episodes[0];
        epTitle = ep.title;
        targetStream = ep.streamUrl;
      }
      await changeMovie({
        movieId: selected.id,
        movieTitle: selected.title,
        streamUrl: targetStream,
        coverImage: selected.coverImage || selected.backdrop || selected.poster,
        episodeTitle: epTitle
      }, currentUser);
      const display = epTitle ? `${selected.title} (${epTitle})` : selected.title;
      triggerSyncToast(`Đã đổi thành công sang: [${display}] cho toàn bộ người xem trong phòng!`);
    }
    setShowChangeMovieModal(false);
  };

  const reactionEmojis = ['🔥', '🐉', '😱', '👏', '🍿', '❤️', '🎉', '🚀'];

  const filteredLobbyRooms = rooms.filter((r) => {
    const q = lobbySearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.movieTitle?.toLowerCase().includes(q) ||
      r.hostName?.toLowerCase().includes(q);

    const matchesMovie =
      !lobbyMovieFilter ||
      r.movieId === lobbyMovieFilter ||
      r.movieTitle?.toLowerCase().includes(lobbyMovieFilter.toLowerCase());

    return matchesSearch && matchesMovie;
  });

  return (
    <div className="w-full max-w-[1920px] mx-auto px-gutter-mobile lg:px-gutter py-space-md space-y-space-md select-none">
      {/* Toast Notification Alert */}
      {syncAlert && (
        <div className="w-full bg-primary/20 border border-primary/40 px-4 py-2.5 rounded-xl flex items-center justify-between text-on-surface text-xs animate-shake shadow-lg">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">info</span>
            <span className="font-medium">{syncAlert}</span>
          </div>
          <button onClick={() => setSyncAlert(null)} className="p-1 hover:opacity-75">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Copy link toast */}
      {copyToast && (
        <div className="fixed top-24 right-6 z-50 bg-secondary text-surface-container-lowest font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>Đã sao chép link phòng xem chung! Gửi ngay cho bạn bè để cùng xem.</span>
        </div>
      )}

      {!activeRoomId ? (
        /* LOBBY VIEW: Danh Sách Phòng Xem Chung */
        <div className="space-y-6 animate-fade-in">
          {/* Banner / Header */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-surface-container via-surface-container-high to-surface-container border border-surface-variant/30 p-6 sm:p-8 shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span>Watch Party Live • Đồng Bộ 4K Dolby Atmos</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight">
                  Phòng Xem Chung Trực Tiếp
                </h1>
                <p className="text-xs sm:text-sm text-outline leading-relaxed">
                  Tự động đồng bộ từng khung hình giữa các người xem, tích hợp trò chuyện giọng nói (voice chat) độ trễ thấp và thả cảm xúc tương tác trực tiếp.
                </p>
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-secondary to-primary hover:from-secondary-fixed hover:to-primary-fixed-dim text-surface-container-lowest font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0"
              >
                <span className="material-symbols-outlined text-lg font-bold">add</span>
                <span>Tạo Phòng Xem Chung</span>
                {!isVipUser && (
                  <span className="px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-bold">
                    VIP 👑
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-surface-container border border-surface-variant/30">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                value={lobbySearchQuery}
                onChange={(e) => setLobbySearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên phòng, tên phim hoặc chủ phòng..."
                className="w-full bg-surface-container-high/60 pl-10 pr-4 py-2 rounded-xl text-xs text-on-surface outline-none border border-surface-variant/30 focus:border-primary transition-all placeholder:text-outline/70"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {lobbyMovieFilter && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 text-xs font-semibold shrink-0">
                  <span>Lọc: {queryMovieTitle || lobbyMovieFilter}</span>
                  <button
                    onClick={() => setLobbyMovieFilter(null)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setLobbyMovieFilter(null);
                  setLobbySearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${!lobbyMovieFilter && !lobbySearchQuery
                  ? 'bg-primary text-on-primary font-bold shadow-sm'
                  : 'bg-surface-container-high hover:bg-surface-bright text-outline hover:text-white'
                  }`}
              >
                Tất Cả ({rooms.length})
              </button>
            </div>
          </div>

          {/* Room Grid or Empty State */}
          {filteredLobbyRooms.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-3xl bg-surface-container border border-surface-variant/40 space-y-4 max-w-xl mx-auto shadow-xl">
              <div className="w-20 h-20 rounded-3xl bg-tertiary/15 text-tertiary flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-4xl">meeting_room</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-lg text-on-surface">
                  Chưa Có Phòng Xem Chung Nào Đang Hoạt Động
                </h3>
                <p className="text-xs sm:text-sm text-outline leading-relaxed max-w-md mx-auto">
                  {lobbyMovieFilter
                    ? `Hiện tại chưa có phòng xem chung nào cho bộ phim này. Bạn hãy là người đầu tiên tạo phòng để cùng xem với bạn bè!`
                    : 'Hiện tại chưa có phòng xem chung nào đang mở. Hãy tạo phòng xem chung mới ngay để cùng nhóm bạn thưởng thức những bộ phim tuyệt vời!'}
                </p>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-secondary to-primary hover:from-secondary-fixed hover:to-primary-fixed-dim text-surface-container-lowest font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-base font-bold">add</span>
                <span>Tạo Phòng Xem Chung Ngay</span>
                {!isVipUser && (
                  <span className="px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-bold">
                    VIP 👑
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLobbyRooms.map((r) => (
                <div
                  key={r.id}
                  className="group relative rounded-2xl bg-surface-container border border-surface-variant/30 hover:border-primary/50 overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                      <img
                        src={r.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600'}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent opacity-80" />

                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>Trực Tiếp</span>
                      </span>

                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-tertiary font-bold text-[10px] flex items-center gap-1 shadow-md">
                        <span className="material-symbols-outlined text-xs">group</span>
                        <span>{r.activeCount || 1} / {r.maxCount || 20}</span>
                      </span>
                    </div>

                    {/* Room Info */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-sm text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                        {r.title}
                      </h3>
                      <p className="text-xs text-outline line-clamp-1">
                        Phim: <strong className="text-primary font-semibold">{r.movieTitle}</strong>
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-outline pt-1 border-t border-surface-variant/20">
                        <span className="flex items-center gap-1 text-secondary font-medium truncate">
                          <span className="material-symbols-outlined text-xs">person</span>
                          <span>{r.hostName}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-outline/80">
                            {r.hostLock ? 'lock' : 'public'}
                          </span>
                          <span>{r.hostLock ? 'Khóa tua' : 'Tự do'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="p-4 pt-0">
                    <button
                      onClick={() => {
                        navigate(`/watch-party?room=${r.id}`);
                      }}
                      className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 hover:shadow-primary/40"
                    >
                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                      <span>Vào Xem Ngay</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ROOM VIEW: Cinema Stage */
        <div className="space-y-space-md">
          {/* Room Header Info & Actions */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-sm p-4 rounded-2xl bg-surface-container border border-surface-variant/30 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-tertiary" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-caps text-[10px] uppercase font-bold tracking-wider">
                    #{currentRoom?.id || 'CS-LIVE'}
                  </span>
                  <h1 className="font-headline-sm text-base lg:text-lg font-bold text-on-surface truncate">
                    {currentRoom?.title || 'Phòng Xem Chung CineStreams'}
                  </h1>
                </div>
                <p className="text-xs text-outline mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Phim: <strong className="text-primary">{currentRoom?.movieTitle || 'Dune 2'}</strong></span>
                  <span>•</span>
                  <span className="text-secondary font-medium">Chủ phòng: {currentRoom?.hostName || 'Chủ phòng VIP'}</span>
                  {isHost && (
                    <span className="px-1.5 py-0.5 rounded bg-secondary/20 text-secondary text-[10px] font-bold">
                      BẠN LÀ CHỦ PHÒNG 👑
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Right Status Badges & Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Socket.IO Realtime Status Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="material-symbols-outlined text-xs">sync</span>
                <span>Socket.IO Sync</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-xs text-on-surface font-semibold">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <span className="text-tertiary">Trễ: {latencyMs}ms</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-xs text-on-surface font-semibold">
                <span className="material-symbols-outlined text-sm text-primary">group</span>
                <span>{participants.length} / {currentRoom?.maxCount || 20} đang xem</span>
              </div>

              <button
                onClick={() => navigate('/watch-party')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs text-on-surface font-semibold transition-all border border-surface-variant/40"
                title="Quay lại danh sách phòng"
              >
                <span className="material-symbols-outlined text-sm">grid_view</span>
                <span className="hidden sm:inline">Danh Sách Phòng</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs text-on-surface font-semibold transition-all border border-surface-variant/40"
                title="Sao chép link mời bạn bè"
              >
                <span className="material-symbols-outlined text-sm">share</span>
                <span className="hidden sm:inline">Mời Bạn Bè</span>
              </button>

              <button
                onClick={async () => {
                  await loadRooms();
                  setShowRoomBrowser(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs text-on-surface font-semibold transition-all border border-surface-variant/40"
                title="Xem danh sách các phòng khác"
              >
                <span className="material-symbols-outlined text-sm">meeting_room</span>
                <span className="hidden sm:inline">Đổi Phòng</span>
              </button>

              {canChangeMovie && (
                <button
                  onClick={handleOpenChangeMovieModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 text-xs font-bold transition-all shadow-sm"
                  title={isHost ? "Chủ phòng: Đổi phim hoặc tập phim đang chiếu cho toàn phòng" : "Đổi phim hoặc tập phim đang chiếu cho phòng"}
                >
                  <span className="material-symbols-outlined text-sm text-amber-400">movie_edit</span>
                  <span className="hidden sm:inline">Đổi Phim / Tập</span>
                </button>
              )}

              <button
                onClick={handleOpenCreateModal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg ${isVipUser
                  ? 'bg-gradient-to-r from-secondary to-primary text-surface-container-lowest'
                  : 'bg-surface-container-high hover:bg-surface-bright text-secondary border border-secondary/40'
                  }`}
                title={isVipUser ? "Khởi tạo phòng xem chung mới" : "Nâng cấp gói VIP để tạo phòng xem chung"}
              >
                <span className="material-symbols-outlined text-sm font-bold">
                  {isVipUser ? 'add' : 'lock'}
                </span>
                <span>Tạo Phòng</span>
                {!isVipUser && (
                  <span className="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary text-[10px] font-bold">
                    VIP 👑
                  </span>
                )}
              </button>

              <button
                onClick={() => toggleMic(currentUser)}
                className={`p-2 rounded-xl border transition-all flex items-center justify-center ${isMicMuted
                  ? 'bg-surface-container-high border-surface-variant/40 text-outline hover:text-white'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  }`}
                title={isMicMuted ? 'Bật micro thoại của bạn' : 'Tắt micro thoại của bạn (đang bật)'}
              >
                <span className={`material-symbols-outlined text-sm ${!isMicMuted ? 'animate-pulse font-bold' : ''}`}>
                  {isMicMuted ? 'mic_off' : 'mic'}
                </span>
              </button>

              <button
                onClick={() => setShowLeaveConfirmModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-error/15 hover:bg-error/25 text-error border border-error/30 hover:border-error/50 text-xs font-bold transition-all shadow-sm"
                title={isHost ? "Đóng phòng xem chung và giải tán phòng" : "Rời khỏi phòng xem chung"}
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span className="hidden sm:inline">Thoát Phòng</span>
              </button>
            </div>
          </div>

          {/* Main Grid: Left Synchronized Cinema Stage & Right Interactive Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
            {/* LEFT: Synchronized Video Player Stage (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <div
                ref={stageRef}
                className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-surface-variant/30 flex flex-col justify-end group select-none"
              >
                {/* HTML5 Video Element */}
                <video
                  ref={videoRef}
                  key={`${currentRoom?.id || 'room'}-${currentRoom?.movieId || 'movie'}-${currentRoom?.streamUrl || 'stream'}`}
                  className="w-full h-full object-contain"
                  playsInline
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTimeLocal(videoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current && videoRef.current.duration) {
                      setDurationLocal(videoRef.current.duration);
                    }
                  }}
                  onEnded={() => {
                    if (isHost) sendPause(videoRef.current?.currentTime || 0, currentUser);
                  }}
                />

                {/* Host Master Lock Banner Overlay */}
                {hostLock && !isHost && (
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md shadow-lg border border-secondary/30">
                    <span className="material-symbols-outlined text-secondary text-sm">lock</span>
                    <span className="text-[11px] font-semibold text-zinc-200">
                      Đang khóa tua: Đồng bộ theo Chủ Phòng ({currentRoom?.hostName})
                    </span>
                  </div>
                )}

                {isHost && (
                  <button
                    onClick={toggleHostLock}
                    className={`absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md shadow-lg border transition-all text-[11px] font-bold ${hostLock
                      ? 'bg-secondary/20 text-secondary border-secondary/40'
                      : 'bg-black/60 text-zinc-300 border-white/20'
                      }`}
                    title="Bấm để bật/tắt khóa điều khiển phòng"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {hostLock ? 'lock' : 'lock_open'}
                    </span>
                    <span>{hostLock ? 'Khóa tua: BẬT (Chỉ bạn điều khiển)' : 'Khóa tua: TẮT (Mọi người có thể tua)'}</span>
                  </button>
                )}

                {/* Top Right Format Badges */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 pointer-events-none">
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-tertiary text-[10px] font-bold">
                    DOLBY ATMOS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-primary text-[10px] font-bold">
                    4K UHD
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-secondary text-[10px] font-bold">
                    FRAME-SYNC
                  </span>
                </div>

                {/* Floating Live Reactions Flow Layer */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  {reactions.map((r) => (
                    <div
                      key={r.id}
                      className="absolute text-4xl animate-float-up drop-shadow-lg"
                      style={{
                        bottom: '18%',
                        left: `${r.x}%`
                      }}
                    >
                      {r.emoji}
                    </div>
                  ))}
                </div>

                {/* Play/Pause Center Indicator on hover */}
                <div
                  onClick={handleTogglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                >
                  <span className="material-symbols-outlined text-primary text-4xl">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </div>

                {/* Bottom Controls Scrubbing HUD */}
                <div className="relative z-30 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  {/* Progress Scrubbing Bar */}
                  <div
                    className="w-full relative py-1.5 cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickPercent = (e.clientX - rect.left) / rect.width;
                      const dur = duration || 3600;
                      handleSeek(clickPercent * dur);
                    }}
                  >
                    <div className="w-full h-1.5 rounded-full bg-zinc-700/60 relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, (currentTime / (duration || 3600)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Control Strip */}
                  <div className="w-full flex items-center justify-between text-on-surface text-xs">
                    {/* Left Controls: Play, Skip, Volume, Timer */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={handleTogglePlay}
                        className="p-1.5 rounded-full hover:bg-white/10 text-primary transition-all"
                        title={isPlaying ? 'Tạm dừng (Space)' : 'Tiếp tục (Space)'}
                      >
                        <span className="material-symbols-outlined text-2xl">
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </button>

                      <button
                        onClick={() => handleSkipTime(-10)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
                        title="Lùi 10 giây"
                      >
                        <span className="material-symbols-outlined text-lg">replay_10</span>
                      </button>

                      <button
                        onClick={() => handleSkipTime(10)}
                        className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
                        title="Tới 10 giây"
                      >
                        <span className="material-symbols-outlined text-lg">forward_10</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const nextMuted = !isMuted;
                            setIsMuted(nextMuted);
                            if (videoRef.current) videoRef.current.muted = nextMuted;
                          }}
                          className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
                          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                        >
                          <span className="material-symbols-outlined text-lg">
                            {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
                          </span>
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            setIsMuted(false);
                            if (videoRef.current) {
                              videoRef.current.volume = val;
                              videoRef.current.muted = false;
                            }
                          }}
                          className="w-14 sm:w-20 h-1 bg-zinc-600 accent-primary rounded cursor-pointer"
                        />
                      </div>

                      <div className="font-mono text-zinc-300 text-xs ml-1">
                        <span className="text-white font-medium">{formatTime(currentTime)}</span>
                        <span className="text-zinc-500"> / {formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Right Controls: Resync button, Fullscreen */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResync}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-bright text-primary text-[11px] font-bold transition-all border border-primary/30"
                        title="Buộc tua khớp ngay với mốc máy chủ"
                      >
                        <span className="material-symbols-outlined text-xs">sync</span>
                        <span className="hidden sm:inline">Đồng Bộ Lại</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!document.fullscreenElement && stageRef.current) {
                            stageRef.current.requestFullscreen?.().catch(() => { });
                          } else {
                            document.exitFullscreen?.().catch(() => { });
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
                        title="Toàn màn hình"
                      >
                        <span className="material-symbols-outlined text-lg">fullscreen</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Reaction Dock below video */}
              <div className="w-full p-2.5 bg-surface-container rounded-2xl border border-surface-variant/30 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">add_reaction</span>
                  <span className="text-xs text-on-surface font-semibold hidden sm:inline">
                    Thả cảm xúc trực tiếp:
                  </span>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {reactionEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => triggerReaction(emoji, currentUser)}
                        className="px-2 sm:px-2.5 py-1 rounded-xl bg-surface-container-high hover:bg-surface-bright transition-transform hover:scale-125 active:scale-95 text-base sm:text-lg"
                        title={`Thả ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleResync}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-primary text-xs font-semibold transition-all border border-surface-variant/40"
                >
                  <span className="material-symbols-outlined text-sm">sync</span>
                  <span>Đồng Bộ (Resync)</span>
                </button>
              </div>

              {/* Quick Watch Party Bento Tools */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Tool 1: Skip Intro Vote */}
                <div className="p-3 bg-surface-container rounded-xl border border-surface-variant/30 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-secondary text-base">how_to_vote</span>
                      <span className="font-semibold text-xs text-on-surface">Bỏ phiếu Tua Intro</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary text-[10px] font-bold">
                      8/12 Đồng ý
                    </span>
                  </div>
                  <p className="text-[11px] text-outline">Cần thêm 1 phiếu để tự động nhảy qua 02:15 đoạn mở đầu.</p>
                  <button
                    onClick={() => handleSkipTime(135)}
                    className="w-full py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs text-on-surface font-medium transition-all"
                  >
                    Bỏ Phiếu Bỏ Qua (+1)
                  </button>
                </div>

                {/* Tool 2: WebRTC Mesh Health */}
                <div className="p-3 bg-surface-container rounded-xl border border-surface-variant/30 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-tertiary text-base">network_check</span>
                      <span className="font-semibold text-xs text-on-surface">Mạng Lưới Mesh P2P</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary text-[10px] font-bold">
                      99.8% Ổn định
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-outline">
                    <span>Độ trễ truyền nhận:</span>
                    <span className="text-on-surface font-medium">{latencyMs}ms</span>
                  </div>
                  <div className="text-[10px] text-center text-outline uppercase font-semibold">
                    MÃ HÓA E2EE • BĂNG THÔNG CAO
                  </div>
                </div>

                {/* Tool 3: Next Up Info */}
                <div className="p-3 bg-surface-container rounded-xl border border-surface-variant/30 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-base">playlist_play</span>
                      <span className="font-semibold text-xs text-on-surface">Chất lượng phòng</span>
                    </div>
                    <span className="text-[10px] text-primary font-bold">4K HDR</span>
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-on-surface truncate">{currentRoom?.movieTitle}</p>
                    <p className="text-[11px] text-outline">Bản quyền số hóa CineStreams VIP</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-primary font-bold">
                    <span>TỰ ĐỘNG ĐỒNG BỘ MỐC XEM</span>
                    <span className="material-symbols-outlined text-sm">toggle_on</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Interactive Side Panel (4 Cols) */}
            <div className="lg:col-span-4 h-[620px] rounded-2xl bg-surface-container border border-surface-variant/40 flex flex-col justify-between overflow-hidden shadow-xl">
              {/* Tab Strip */}
              <div className="w-full bg-surface-container-high p-1.5 flex items-center gap-1 border-b border-surface-variant/30">
                <button
                  onClick={() => setActiveSideTab('chat')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${activeSideTab === 'chat'
                    ? 'bg-surface text-primary shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">forum</span>
                  <span>Trò Chuyện</span>
                </button>

                <button
                  onClick={() => setActiveSideTab('members')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${activeSideTab === 'members'
                    ? 'bg-surface text-primary shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">group</span>
                  <span>Thành Viên ({participants.length})</span>
                </button>

                <button
                  onClick={() => setActiveSideTab('voice')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${activeSideTab === 'voice'
                    ? 'bg-surface text-primary shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">mic</span>
                  <span>Thoại Mesh</span>
                </button>
              </div>

              {/* TAB 1: LIVE CHAT */}
              {activeSideTab === 'chat' && (
                <div className="flex-1 flex flex-col min-h-0 bg-surface-container">
                  {/* Pinned Announcement */}
                  {pinnedMessage && (
                    <div className="px-3 py-2 bg-surface-container-high/80 border-b border-surface-variant/20 flex items-start gap-2">
                      <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">
                        push_pin
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-secondary font-bold uppercase">
                          Ghim từ Chủ Phòng ({currentRoom?.hostName})
                        </span>
                        <p className="text-xs text-on-surface mt-0.5 line-clamp-2">{pinnedMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* Chat Feed */}
                  <div ref={chatFeedRef} className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="flex items-start gap-2 text-xs">
                        {msg.isSystem ? (
                          <div className="w-full flex items-center justify-center my-1">
                            <span className="px-3 py-1 rounded-full bg-surface-container-highest text-outline text-[11px] font-medium flex items-center gap-1 text-center">
                              <span className="material-symbols-outlined text-xs text-primary">info</span>
                              {msg.text}
                            </span>
                          </div>
                        ) : (
                          <>
                            <img
                              src={msg.avatar || '/default-avatar.png'}
                              alt={msg.user}
                              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                            />
                            <div className="bg-surface-container-high/90 p-2.5 rounded-xl max-w-[85%] border border-surface-variant/30 shadow-sm">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-bold text-[11px] text-on-surface flex items-center gap-1">
                                  {msg.user}
                                  {msg.isHost && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-secondary/20 text-secondary font-bold">
                                      👑 HOST
                                    </span>
                                  )}
                                  {msg.isVip && !msg.isHost && (
                                    <span className="material-symbols-outlined text-xs text-secondary-fixed">
                                      workspace_premium
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-outline">{msg.time}</span>
                              </div>

                              {msg.isSpoiler ? (
                                <div
                                  onClick={(e) => {
                                    const el = e.currentTarget.querySelector('.spoiler-text');
                                    el?.classList.toggle('blur-sm');
                                  }}
                                  className="cursor-pointer"
                                >
                                  <span className="text-[10px] text-primary font-bold block mb-0.5">
                                    [Cảnh Báo Tiết Lộ Nội Dung - Bấm để đọc]
                                  </span>
                                  <p className="spoiler-text blur-sm text-on-surface-variant leading-relaxed select-text transition-all">
                                    {msg.text}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-on-surface-variant leading-relaxed select-text">
                                  {msg.text}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 border-t border-surface-variant/30 bg-surface-container-high flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                        placeholder="Bình luận cùng bạn bè..."
                        className="flex-1 bg-surface-container px-3 py-2 rounded-xl text-xs text-on-surface outline-none border border-surface-variant/40 focus:border-primary"
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-xl bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors flex items-center justify-center shrink-0"
                        title="Gửi tin nhắn"
                      >
                        <span className="material-symbols-outlined text-base">send</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-outline px-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSpoilerMsg}
                          onChange={(e) => setIsSpoilerMsg(e.target.checked)}
                          className="accent-primary rounded"
                        />
                        <span>Gắn nhãn Tiết Lộ (Spoiler)</span>
                      </label>
                      <span className="text-[10px]">Nhấn Enter để gửi</span>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: PARTICIPANTS */}
              {(activeSideTab === 'members' || (activeSideTab as string) === 'participants') && (
                <div className="flex-1 flex flex-col p-3 bg-surface-container overflow-y-auto">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-bold text-on-surface">
                      Đang xem ({participants.length}/{currentRoom?.maxCount || 20})
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Trực tiếp
                    </span>
                  </div>

                  <div className="space-y-2">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface-container-high/60 border border-surface-variant/20 hover:border-surface-variant/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={p.avatar || '/default-avatar.png'}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-on-surface truncate">
                                {p.name}
                              </span>
                              {p.isHost && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-secondary/20 text-secondary font-bold shrink-0">
                                  👑 HOST
                                </span>
                              )}
                              {p.isVip && !p.isHost && (
                                <span className="material-symbols-outlined text-xs text-secondary-fixed shrink-0">
                                  workspace_premium
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-outline block">
                              {p.isHost ? 'Quản trị phòng' : 'Hội viên xem chung'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`material-symbols-outlined text-base transition-all duration-300 ${
                              p.isMicMuted
                                ? 'text-outline/40'
                                : 'text-emerald-400 font-bold scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                            }`}
                            title={p.isMicMuted ? `${p.name}: Micro đang tắt` : `${p.name}: Micro đang bật (nói được)`}
                          >
                            {p.isMicMuted ? 'mic_off' : 'mic'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Host Settings Box if Current User is Host */}
                  {isHost && (
                    <div className="mt-4 p-3 rounded-xl bg-surface-container-high border border-secondary/30 space-y-2.5">
                      <span className="text-xs font-bold text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                        Quyền Lực Chủ Phòng
                      </span>
                      <div className="flex items-center justify-between text-xs text-on-surface">
                        <span>Khóa quyền điều khiển video:</span>
                        <button
                          onClick={toggleHostLock}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${hostLock ? 'bg-secondary text-surface-container-lowest' : 'bg-surface-variant text-on-surface'
                            }`}
                        >
                          {hostLock ? 'Đang Khóa' : 'Tự Do'}
                        </button>
                      </div>
                      <button
                        onClick={() => setShowChangeMovieModal(true)}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-xs text-amber-300 font-bold border border-amber-500/40 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm text-amber-400">movie_edit</span>
                        <span>Đổi Phim Hoặc Tập Phim</span>
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="w-full py-2 rounded-lg bg-surface hover:bg-surface-bright text-xs text-primary font-semibold border border-surface-variant/40"
                      >
                        Sao Chép Link Mời Người Khác
                      </button>
                      <button
                        onClick={() => setShowLeaveConfirmModal(true)}
                        className="w-full py-2 rounded-lg bg-error/15 hover:bg-error/25 text-xs text-error font-bold border border-error/30 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm">power_settings_new</span>
                        <span>Đóng Phòng & Thoát Về Trang Chủ</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: VOICE MESH */}
              {activeSideTab === 'voice' && (
                <div className="flex-1 flex flex-col p-4 space-y-4 bg-surface-container text-xs">
                  <div className="p-3 rounded-xl bg-surface-container-high border border-surface-variant/30 space-y-2 text-center">
                    <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-tertiary/20 text-tertiary">
                      <span className="material-symbols-outlined text-2xl">spatial_audio</span>
                    </div>
                    <h4 className="font-bold text-sm text-on-surface">Kênh Đàm Thoại Thời Gian Thực</h4>
                    <p className="text-[11px] text-outline">
                      Trò chuyện bằng giọng nói với bạn bè qua kết nối Mesh P2P mã hóa đầu-cuối.
                    </p>
                    <button
                      onClick={() => toggleMic(currentUser)}
                      className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${isMicMuted
                        ? 'bg-surface-container-highest text-outline hover:text-white'
                        : 'bg-primary text-on-primary'
                        }`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {isMicMuted ? 'mic_off' : 'mic'}
                      </span>
                      <span>{isMicMuted ? 'Bật Micro Của Bạn' : 'Đang Bật Micro (Bấm để tắt)'}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-on-surface">Thông Số Kỹ Thuật Kết Nối:</span>
                    <div className="p-2.5 rounded-xl bg-surface-container-high space-y-1.5 text-[11px] text-outline">
                      <div className="flex justify-between">
                        <span>Chuẩn âm thanh:</span>
                        <span className="text-on-surface font-semibold">Opus 48kHz Stereo</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Độ trễ voice (RTT):</span>
                        <span className="text-tertiary font-semibold">{latencyMs}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chống ồn AI:</span>
                        <span className="text-secondary font-semibold">Tự động kích hoạt</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Room Browser */}
      {showRoomBrowser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface-container rounded-2xl border border-surface-variant/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">meeting_room</span>
                <h3 className="font-bold text-base text-on-surface">Danh Sách Phòng Đang Chiếu Trực Tiếp</h3>
              </div>
              <button
                onClick={() => setShowRoomBrowser(false)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-outline hover:text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto space-y-3">
              {rooms.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-2xl bg-surface-container-high/60 border border-surface-variant/40 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-2xl">meeting_room</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-on-surface">Chưa Có Phòng Xem Chung Nào</h4>
                    <p className="text-xs text-outline">Hiện tại không có phòng xem chung nào đang hoạt động. Hãy tạo phòng mới ngay!</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoomBrowser(false);
                      handleOpenCreateModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-surface-container-lowest font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                    <span>Tạo Phòng Mới</span>
                  </button>
                </div>
              ) : (
                rooms.map((r) => {
                  const isCurrent = r.id === currentRoom?.id;
                  return (
                    <div
                      key={r.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${isCurrent
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-surface-container-high border-surface-variant/30 hover:border-primary/40'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={r.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300'}
                          alt={r.title}
                          className="w-16 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-on-surface truncate">{r.title}</h4>
                          <p className="text-[11px] text-outline truncate">
                            Phim: <span className="text-primary">{r.movieTitle}</span> • Chủ phòng: {r.hostName}
                          </p>
                          <span className="text-[10px] text-tertiary flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                            {r.activeCount || 1} người đang xem
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="px-3.5 py-1.5 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-bold shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <span>Đang Xem</span>
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            setShowRoomBrowser(false);
                            await joinRoom(r.id, currentUser);
                            navigate(`/watch-party?room=${r.id}`);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shrink-0 hover:bg-primary-fixed-dim transition-colors"
                        >
                          Vào Xem
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Watch Party Room */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container rounded-2xl border border-surface-variant/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">video_call</span>
                <h3 className="font-bold text-base text-on-surface">Tạo Phòng Xem Chung Mới</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-outline hover:text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-outline font-semibold mb-1">Tên phòng chiếu:</label>
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="Ví dụ: Xem Chung Dune 2 Cùng Nhóm Bạn"
                  className="w-full bg-surface-container-high px-3 py-2 rounded-xl text-on-surface outline-none border border-surface-variant/40 focus:border-primary"
                />
              </div>

              {/* Tìm & Chọn phim muốn xem trên website */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-outline font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-secondary">movie</span>
                    <span>Tìm phim muốn xem trên CineStreams:</span>
                  </label>
                  {(() => {
                    const sel = allWebMovies.find((m) => m.id === selectedMovieId);
                    return sel ? (
                      <span className="text-[11px] text-primary truncate max-w-[210px]" title={sel.title}>
                        Đã chọn: <b className="text-white">{sel.title}</b>
                      </span>
                    ) : null;
                  })()}
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">
                    search
                  </span>
                  <input
                    type="text"
                    value={createRoomSearchQuery}
                    onChange={(e) => setCreateRoomSearchQuery(e.target.value)}
                    placeholder="Gõ tên phim, thể loại (ví dụ: Dune, Mai, Arcane, Anime, Oppenheimer...)..."
                    className="w-full bg-surface-container-high pl-9 pr-8 py-2 rounded-xl text-on-surface outline-none border border-surface-variant/40 focus:border-primary text-xs"
                  />
                  {createRoomSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCreateRoomSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-white"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>

                {/* Danh sách kết quả tìm kiếm phim trên web */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[190px] overflow-y-auto p-1.5 border border-surface-variant/30 rounded-xl bg-surface-container-lowest/60">
                  {createFilteredMovies.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-outline text-xs">
                      Không tìm thấy phim nào khớp với "{createRoomSearchQuery}".
                    </div>
                  ) : (
                    createFilteredMovies.map((m) => {
                      const isSelected = m.id === selectedMovieId;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMovieId(m.id)}
                          className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${isSelected
                            ? 'bg-secondary/20 border-secondary text-white shadow-md ring-1 ring-secondary/50'
                            : 'bg-surface-container-high/80 border-surface-variant/30 hover:border-secondary/40 hover:bg-surface-container-high'
                            }`}
                        >
                          <img
                            src={m.coverImage || m.poster || m.backdrop}
                            alt={m.title}
                            className="w-11 h-11 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs truncate">{m.title}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-outline mt-0.5">
                              <span className="px-1 py-0.2 rounded bg-surface-container text-amber-300 font-semibold border border-amber-500/30">
                                {m.type === 'series' ? 'Phim Bộ' : 'Phim Lẻ'}
                              </span>
                              <span>{m.releaseYear || '2024'}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-secondary text-base shrink-0">
                              check_circle
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
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
                  <span className="text-[11px] text-outline">Chỉ bạn (chủ phòng) mới có thể Play/Pause/Tua</span>
                </div>
                <input
                  type="checkbox"
                  checked={newRoomHostLock}
                  onChange={(e) => setNewRoomHostLock(e.target.checked)}
                  className="accent-primary w-4 h-4 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-surface-container-lowest font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-primary/30"
              >
                Khởi Tạo Phòng & Bắt Đầu Xem
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Movie / Episode (Host Only) */}
      {showChangeMovieModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface-container rounded-2xl border border-surface-variant/40 p-5 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-2xl">movie_edit</span>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Thay Đổi Phim Hoặc Tập Phim</h3>
                  <p className="text-[11px] text-outline">Quyền hạn Chủ Phòng: Đồng bộ phim mới ngay lập tức cho toàn bộ người xem</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangeMovieModal(false)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-outline hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Switch Tabs */}
            <div className="flex rounded-xl bg-surface-container-high p-1 gap-1 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setMovieChangeTab('catalog')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${movieChangeTab === 'catalog'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-outline hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-sm">video_library</span>
                <span>Thư Viện Phim & Tập</span>
              </button>
              <button
                type="button"
                onClick={() => setMovieChangeTab('custom')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${movieChangeTab === 'custom'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-outline hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-sm">link</span>
                <span>Nhập Link Phim Tùy Chỉnh</span>
              </button>
            </div>

            <form onSubmit={handleChangeMovieSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              {movieChangeTab === 'catalog' ? (
                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-outline font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-400">search</span>
                        <span>Tìm & chọn phim muốn đổi trên CineStreams:</span>
                      </label>
                      {(() => {
                        const sel = allWebMovies.find((m) => m.id === selectedChangeMovieId);
                        return sel ? (
                          <span className="text-[11px] text-amber-300 truncate max-w-[210px]" title={sel.title}>
                            Đã chọn: <b className="text-white">{sel.title}</b>
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Thanh tìm kiếm phim khi đổi phim */}
                    <div className="relative mb-2.5">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">
                        search
                      </span>
                      <input
                        type="text"
                        value={changeMovieSearchQuery}
                        onChange={(e) => setChangeMovieSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm phim trên web (ví dụ: Dune, Arcane, Mai, Shōgun, Kimi no Na wa...)..."
                        className="w-full bg-surface-container-high pl-9 pr-8 py-2 rounded-xl text-on-surface outline-none border border-surface-variant/40 focus:border-amber-400 text-xs"
                      />
                      {changeMovieSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setChangeMovieSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-white"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto p-1 border border-surface-variant/20 rounded-xl bg-surface-container-lowest/50">
                      {changeFilteredMovies.length === 0 ? (
                        <div className="col-span-full py-6 text-center text-outline text-xs">
                          Không tìm thấy phim nào khớp với "{changeMovieSearchQuery}".
                        </div>
                      ) : (
                        changeFilteredMovies.map((m) => {
                          const isSelected = m.id === selectedChangeMovieId;
                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedChangeMovieId(m.id);
                                setSelectedChangeEpisodeIndex(0);
                              }}
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${isSelected
                                ? 'bg-amber-500/15 border-amber-500/70 shadow-md ring-1 ring-amber-500/50'
                                : 'bg-surface-container-high/80 border-surface-variant/30 hover:border-amber-500/40 hover:bg-surface-container-high'
                                }`}
                            >
                              <img
                                src={m.coverImage || m.poster || m.backdrop}
                                alt={m.title}
                                className="w-14 h-14 rounded-lg object-cover shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-xs text-on-surface truncate">{m.title}</h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-outline mt-0.5">
                                  <span className="px-1 py-0.2 rounded bg-surface-container text-amber-300 font-semibold border border-amber-500/30">
                                    {m.type === 'series' ? 'Phim Bộ' : 'Phim Lẻ'}
                                  </span>
                                  <span>{m.duration || (m.episodes ? `${m.episodes.length} Tập` : 'Full HD')}</span>
                                </div>
                                <span className="text-[10px] text-primary block truncate mt-0.5 font-medium">
                                  {m.quality || m.qualityBadge || '4K ULTRA HD'}
                                </span>
                              </div>
                              {isSelected && (
                                <span className="material-symbols-outlined text-amber-400 text-lg shrink-0">
                                  check_circle
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Episode Selector if series */}
                  {(() => {
                    const activeMovie = allWebMovies.find((m) => m.id === selectedChangeMovieId);
                    if (!activeMovie || !activeMovie.episodes || activeMovie.episodes.length === 0) return null;

                    return (
                      <div className="p-3 rounded-xl bg-surface-container-high border border-surface-variant/40 space-y-2">
                        <label className="block text-amber-300 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">list</span>
                          <span>Chọn tập phim muốn phát cùng phòng:</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeMovie.episodes.map((ep: any, idx: number) => {
                            const isEpSelected = selectedChangeEpisodeIndex === idx;
                            return (
                              <button
                                key={ep.ep}
                                type="button"
                                onClick={() => setSelectedChangeEpisodeIndex(idx)}
                                className={`px-3 py-2 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between border ${isEpSelected
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                                  : 'bg-surface-container text-outline hover:text-white border-surface-variant/30'
                                  }`}
                              >
                                <span className="truncate">{ep.title}</span>
                                {isEpSelected && (
                                  <span className="material-symbols-outlined text-sm text-amber-400 shrink-0 ml-1">
                                    play_arrow
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-outline font-semibold mb-1">Tên phim / Tiêu đề video:</label>
                    <input
                      type="text"
                      value={customMovieName}
                      onChange={(e) => setCustomMovieName(e.target.value)}
                      placeholder="Ví dụ: Video Trailer Phim Mới 2026"
                      className="w-full bg-surface-container-high px-3 py-2 rounded-xl text-on-surface outline-none border border-surface-variant/40 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-outline font-semibold mb-1">Link Stream HLS (.m3u8) hoặc MP4:</label>
                    <input
                      type="url"
                      value={customStreamInput}
                      onChange={(e) => setCustomStreamInput(e.target.value)}
                      placeholder="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
                      className="w-full bg-surface-container-high px-3 py-2 rounded-xl text-on-surface outline-none border border-surface-variant/40 focus:border-primary font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-outline font-semibold mb-1">Link ảnh bìa poster (tùy chọn):</label>
                    <input
                      type="url"
                      value={customCoverInput}
                      onChange={(e) => setCustomCoverInput(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-surface-container-high px-3 py-2 rounded-xl text-on-surface outline-none border border-surface-variant/40 focus:border-primary text-[11px]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-surface-variant/30">
                <button
                  type="button"
                  onClick={() => setShowChangeMovieModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-outline hover:text-white font-semibold transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-surface-container-lowest font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-sm font-bold">sync</span>
                  <span>Đổi Phim & Đồng Bộ Cả Phòng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Leave Room */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-surface-container rounded-2xl border border-surface-variant/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isHost ? 'bg-amber-500/20 text-amber-400' : 'bg-error/20 text-error'}`}>
                <span className="material-symbols-outlined text-2xl">
                  {isHost ? 'warning' : 'logout'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">
                  {isHost ? 'Đóng Phòng Xem Chung & Thoát?' : 'Rời Khỏi Phòng Xem Chung?'}
                </h3>
                <span className="text-[11px] text-outline">
                  {isHost ? 'Cảnh báo quyền hạn Chủ Phòng' : 'Xác nhận thoát phòng'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-high border border-surface-variant/30 text-xs text-on-surface-variant leading-relaxed">
              {isHost ? (
                <div className="space-y-2">
                  <p className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">shield</span>
                    Bạn đang là Chủ Phòng ({currentRoom?.hostName || 'Host'})!
                  </p>
                  <p>
                    Khi bạn thoát, <strong>phòng xem chung này sẽ bị xóa hoàn toàn</strong>, <strong>toàn bộ đoạn chat trong thời gian phòng hoạt động sẽ bị xóa sạch</strong> và tất cả người xem sẽ được tự động đưa về trang danh sách phòng.
                  </p>
                </div>
              ) : (
                <p>
                  Bạn có chắc chắn muốn rời khỏi phòng xem chung này không? Danh sách thành viên sẽ được cập nhật lại và bạn sẽ được chuyển về trang chủ.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs text-outline hover:text-white font-semibold transition-colors"
              >
                Ở Lại Xem Tiếp
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${isHost
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                  : 'bg-error hover:bg-error/90 text-on-error shadow-error/30'
                  }`}
              >
                <span className="material-symbols-outlined text-sm font-bold">
                  {isHost ? 'delete_forever' : 'logout'}
                </span>
                <span>{isHost ? 'Đóng & Xóa Phòng' : 'Rời Phòng & Về Sảnh'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
