export interface Movie {
  id: string;
  slug?: string;
  title: string;
  originalTitle?: string;
  type: 'movie' | 'series' | 'anime';
  synopsis: string;
  backdrop: string;
  poster: string;
  imdbRating: number;
  duration?: string;
  releaseYear: number;
  ageRating: string;
  badge?: string;
  qualityBadge: string;
  audioBadge?: string;
  genres: string[];
  director?: string;
  cast?: string[];
  views?: string;
  viewCount?: number;
  rank?: number;
  rankDelta?: string;
  cineAiMatch?: number;
  seasons?: Season[];
  trailerUrl?: string;
  streamUrl?: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  duration: string;
  thumbnail: string;
  synopsis?: string;
  streamUrl: string;
}

export type MovieEntity = Movie;
export type EpisodeEntity = Episode & { hlsMasterUrl?: string; videoMasterUrl?: string; movieId?: string };

export interface Season {
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export interface ContinueWatchingItem {
  id: string;
  movieId: string;
  title: string;
  episodeInfo: string;
  backdrop: string;
  syncedDevice: string;
  deviceIcon: string;
  currentSeconds: number;
  totalSeconds: number;
  percent: number;
}

export interface VipPlan {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: number;
  priceYearly: number;
  discountBadge?: string;
  features: string[];
  maxDevices: number;
  resolution: string;
  sound: string;
  isPopular?: boolean;
}

export interface WatchPartyParticipant {
  id: string;
  name: string;
  avatar: string;
  isVip: boolean;
  isHost: boolean;
  isMicMuted?: boolean;
  isSpeaking?: boolean;
  joinedAt?: string;
}

export interface WatchPartyRoom {
  id: string;
  title: string;
  movieId?: string;
  movieTitle: string;
  streamUrl?: string;
  hostName: string;
  hostId?: string;
  hostLock?: boolean;
  isPlaying?: boolean;
  currentTimeSeconds?: number;
  activeCount: number;
  maxCount: number;
  currentTime: string;
  coverImage: string;
  isLive: boolean;
  pinnedMessage?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  isVip: boolean;
  text: string;
  time: string;
  userId?: string;
  isHost?: boolean;
  isSystem?: boolean;
  isSpoiler?: boolean;
}

export interface WatchPartyReaction {
  id: string;
  emoji: string;
  x: number;
  user?: string;
}

export interface CineAiAnalysisPoint {
  index: number;
  title: string;
  content: string;
}

export interface CineAiRecommendedMovie extends Movie {
  matchPercent?: number;
  matchReason?: string;
}

export interface RagCitation {
  sourceId: string;
  title: string;
  sourceType: 'movies' | 'deep_explainer' | 'platform';
  sourceTitle: string;
  similarity: number;
  snippet: string;
  matchedTerms?: string[];
  metadata?: Record<string, any>;
}

export interface CineAiMessage {
  id: string;
  sender: 'user' | 'cineai';
  text: string;
  isStreaming?: boolean;
  mode?: 'mood' | 'explainer' | 'compare';
  executiveSummary?: string;
  analysisPoints?: CineAiAnalysisPoint[];
  recommendedMovies?: CineAiRecommendedMovie[];
  ragCitations?: RagCitation[];
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'update' | 'promo' | 'watchparty';
  link?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  isVip: boolean;
  vipTier?: string;
  vipExpiresAt?: string;
  isKidsMode: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface SubProfile {
  id: string;
  name: string;
  avatar: string;
  role: string;
  isMaster?: boolean;
  isKids?: boolean;
  pinRequired?: boolean;
  pin?: string;
  currentMovie?: string;
  currentEpisode?: string;
  progressPercent?: number;
  maturityRating?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserProfile;
}

