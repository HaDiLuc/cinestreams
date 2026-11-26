import { create } from 'zustand';
import { Movie, ContinueWatchingItem } from '../types';
import { apiClient } from '../services/apiClient';
import { ALL_MOVIES, HERO_MOVIES } from '../data/moviesData';
import { formatFullViews } from '../utils/formatters';

interface MovieState {
  movies: Movie[];
  heroMovies: Movie[];
  activeHeroIndex: number;
  continueWatching: ContinueWatchingItem[];
  watchlist: string[];
  searchQuery: string;
  isSearchOpen: boolean;
  selectedCategory: string;
  isLoadingDynamic: boolean;

  // Actions
  fetchDynamicMovies: () => Promise<void>;
  fetchUserData: () => Promise<void>;
  setActiveHeroIndex: (index: number) => void;
  nextHero: () => void;
  prevHero: () => void;
  toggleWatchlist: (movieId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setIsSearchOpen: (open: boolean) => void;
  setSelectedCategory: (category: string) => void;
  updateWatchProgress: (id: string, currentSeconds: number) => void;
  removeContinueWatching: (id: string) => Promise<void>;
  incrementViewCount: (movieId: string) => Promise<void>;
}

export const useMovieStore = create<MovieState>((set, get) => ({
  // Dữ liệu ban đầu với thư viện phim phong phú, tự động cập nhật khi có phim thực từ MongoDB
  movies: ALL_MOVIES,
  heroMovies: HERO_MOVIES.slice(0, 5),
  activeHeroIndex: 0,
  continueWatching: [],
  watchlist: [],
  searchQuery: '',
  isSearchOpen: false,
  selectedCategory: 'all',
  isLoadingDynamic: false,

  /**
   * TASK-064: Lấy dữ liệu phim thực từ MongoDB qua Spring Boot API (/api/movies)
   */
  fetchDynamicMovies: async () => {
    set({ isLoadingDynamic: true });
    try {
      const res = await apiClient.get<any[]>('/movies');
      if (res.success && res.data && res.data.length > 0) {
        const mapped: Movie[] = res.data.map((item) => {
          const rawViews = typeof item.views === 'number' ? item.views : 0;
          return {
            id: item.id || item.slug,
            slug: item.slug || item.id,
            title: item.title,
            originalTitle: item.originalTitle,
            type: item.type || 'movie',
            synopsis: item.synopsis || '',
            backdrop: item.backdrop || item.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop',
            poster: item.poster || item.backdrop || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop',
            imdbRating: item.imdbRating || 8.5,
            releaseYear: item.releaseYear || 2026,
            ageRating: item.ageRating || '16+',
            badge: item.badge,
            qualityBadge: item.qualityBadge || '4K ULTRA HD',
            audioBadge: item.audioBadge || 'DOLBY ATMOS',
            genres: item.genres || ['Điện Ảnh'],
            director: item.director,
            cast: item.cast || [],
            views: rawViews > 0 ? formatFullViews(rawViews) : '0 lượt xem',
            viewCount: rawViews,
            duration: item.duration || 'Đang cập nhật',
            trailerUrl: item.trailerUrl,
            streamUrl: item.streamUrl || `/hls/${item.id}/hls/master.m3u8`
          };
        });

        set({
          movies: mapped,
          heroMovies: mapped.slice(0, 5),
          isLoadingDynamic: false
        });
      } else {
        set({ movies: ALL_MOVIES, heroMovies: HERO_MOVIES.slice(0, 5), isLoadingDynamic: false });
      }
    } catch (err) {
      set({ movies: ALL_MOVIES, heroMovies: HERO_MOVIES.slice(0, 5), isLoadingDynamic: false });
    }
  },

  fetchUserData: async () => {
    try {
      const [wlRes, histRes] = await Promise.all([
        apiClient.get<string[]>('/user/watchlist'),
        apiClient.get<any[]>('/user/history')
      ]);
      const updates: Partial<MovieState> = {};
      if (wlRes.success && Array.isArray(wlRes.data)) {
        updates.watchlist = wlRes.data;
      }
      if (histRes.success && Array.isArray(histRes.data)) {
        const currentMovies = get().movies;
        updates.continueWatching = histRes.data.map((h: any) => {
          const matched = currentMovies.find((m) => m.id === h.movieId || m.slug === h.movieId);
          return {
            id: h.movieId || h.id,
            movieId: h.movieId,
            title: matched?.title || h.movieId,
            episodeInfo: h.episodeNumber ? `Tập ${h.episodeNumber}` : (matched?.type === 'series' ? 'Đang xem dở' : 'Phim lẻ'),
            backdrop: matched?.backdrop || matched?.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop',
            syncedDevice: 'Đồng bộ đám mây',
            deviceIcon: 'devices',
            currentSeconds: Number(h.currentSeconds) || 0,
            totalSeconds: Number(h.totalSeconds) || 0,
            percent: Number(h.progressPercent) || 0
          };
        });
      }
      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    } catch {
      // Ignore if unauthenticated or offline
    }
  },
  setActiveHeroIndex: (index) => set({ activeHeroIndex: index }),
  nextHero: () => {
    const { heroMovies, activeHeroIndex } = get();
    if (heroMovies.length === 0) return;
    set({ activeHeroIndex: (activeHeroIndex + 1) % heroMovies.length });
  },
  prevHero: () => {
    const { heroMovies, activeHeroIndex } = get();
    if (heroMovies.length === 0) return;
    set({ activeHeroIndex: (activeHeroIndex - 1 + heroMovies.length) % heroMovies.length });
  },
  toggleWatchlist: async (movieId) => {
    const { watchlist } = get();
    const exists = watchlist.includes(movieId);
    set({
      watchlist: exists ? watchlist.filter((id) => id !== movieId) : [...watchlist, movieId]
    });
    try {
      const res = await apiClient.post<string[]>(`/user/watchlist/${encodeURIComponent(movieId)}`);
      if (res.success && Array.isArray(res.data)) {
        set({ watchlist: res.data });
      }
    } catch {
      // Keep optimistic state if offline
    }
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  updateWatchProgress: (id, currentSeconds) => {
    const { continueWatching } = get();
    set({
      continueWatching: continueWatching.map((item) => {
        if (item.id === id) {
          const percent = Math.min(100, Math.round((currentSeconds / item.totalSeconds) * 100));
          return { ...item, currentSeconds, percent };
        }
        return item;
      })
    });
  },
  removeContinueWatching: async (id) => {
    const { continueWatching } = get();
    const target = continueWatching.find((item) => item.id === id);
    const movieId = target?.movieId || id;
    set({ continueWatching: continueWatching.filter((item) => item.id !== id) });
    try {
      await apiClient.delete(`/user/history/${encodeURIComponent(movieId)}`);
    } catch {
      // Keep optimistic removal
    }
  },
  incrementViewCount: async (movieId: string) => {
    try {
      const res = await apiClient.post<any>(`/movies/${movieId}/view`);
      if (res && res.success) {
        const updatedViews = (res as any)?.views ?? res.data?.views ?? 0;
        const formatted = formatFullViews(updatedViews);
        set((state) => ({
          movies: state.movies.map((m) =>
            m.id === movieId || m.slug === movieId
              ? { ...m, viewCount: updatedViews, views: formatted }
              : m
          ),
          heroMovies: state.heroMovies.map((m) =>
            m.id === movieId || m.slug === movieId
              ? { ...m, viewCount: updatedViews, views: formatted }
              : m
          )
        }));
      }
    } catch (_err) {
      // Offline fallback: locally increment
      set((state) => ({
        movies: state.movies.map((m) => {
          if (m.id === movieId || m.slug === movieId) {
            const nextCount = (m.viewCount || 0) + 1;
            return { ...m, viewCount: nextCount, views: formatFullViews(nextCount) };
          }
          return m;
        })
      }));
    }
  }
}));

// Tự động gọi fetch khi ứng dụng khởi tạo
useMovieStore.getState().fetchDynamicMovies();
