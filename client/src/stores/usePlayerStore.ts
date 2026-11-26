import { create } from 'zustand';

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  quality: string;
  audioTrack: string;
  subtitleTrack: string;
  playbackSpeed: number;
  isTheatreMode: boolean;
  isFullscreen: boolean;

  // Actions
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setQuality: (quality: string) => void;
  setAudioTrack: (track: string) => void;
  setSubtitleTrack: (track: string) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleTheatreMode: () => void;
  toggleFullscreen: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  quality: '4K ULTRA HD (60fps)',
  audioTrack: 'Tiếng Việt (Lồng tiếng chuẩn rạp 5.1)',
  subtitleTrack: 'Vietsub (Phụ đề Tiếng Việt)',
  playbackSpeed: 1,
  isTheatreMode: false,
  isFullscreen: false,

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setQuality: (quality) => set({ quality }),
  setAudioTrack: (audioTrack) => set({ audioTrack }),
  setSubtitleTrack: (subtitleTrack) => set({ subtitleTrack }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  toggleTheatreMode: () => set((state) => ({ isTheatreMode: !state.isTheatreMode })),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
}));
