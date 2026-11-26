import { create } from 'zustand';
import { WatchPartyRoom, ChatMessage, WatchPartyParticipant, WatchPartyReaction } from '../types';
import { apiClient } from '../services/apiClient';
import { watchPartySocket } from '../services/socketService';

interface CreateRoomInput {
  title?: string;
  movieId?: string;
  movieTitle?: string;
  streamUrl?: string;
  coverImage?: string;
  maxCount?: number;
  hostLock?: boolean;
}

interface WatchPartyState {
  rooms: WatchPartyRoom[];
  currentRoom: WatchPartyRoom | null;
  participants: WatchPartyParticipant[];
  chatMessages: ChatMessage[];
  reactions: WatchPartyReaction[];
  isPlaying: boolean;
  currentTime: number; // in seconds
  duration: number; // in seconds
  isHost: boolean;
  hostLock: boolean;
  isMicMuted: boolean;
  isVideoMuted: boolean;
  isConnected: boolean;
  latencyMs: number;
  pinnedMessage: string;
  activeSideTab: 'chat' | 'members' | 'voice';
  isRoomClosed: boolean;
  roomClosedReason: string | null;
  resetRoomClosed: () => void;

  // Internal references
  sseSource: EventSource | null;
  broadcastChannel: BroadcastChannel | null;
  syncTimer: any;
  lastRemoteSyncTime: number;

  // Actions
  loadRooms: () => Promise<WatchPartyRoom[]>;
  createRoom: (input: CreateRoomInput, currentUser: any) => Promise<WatchPartyRoom | null>;
  joinRoom: (roomId: string, currentUser: any) => Promise<void>;
  leaveRoom: (currentUser?: any) => void;
  closeRoom: (currentUser?: any) => Promise<void>;
  fetchRoomSync: (roomId: string, currentUser?: any) => Promise<void>;
  sendPlay: (time: number, currentUser?: any) => void;
  sendPause: (time: number, currentUser?: any) => void;
  sendSeek: (time: number, currentUser?: any) => void;
  sendSyncBeacon: (time: number, isPlaying: boolean) => void;
  sendMessage: (text: string, isSpoiler?: boolean, currentUser?: any) => void;
  triggerReaction: (emoji: string, currentUser?: any) => void;
  removeReaction: (id: string) => void;
  toggleMic: (currentUser?: any) => void;
  toggleVideo: () => void;
  toggleHostLock: () => void;
  changeMovie: (
    movieData: {
      movieId: string;
      movieTitle: string;
      streamUrl: string;
      coverImage?: string;
      episodeTitle?: string;
    },
    currentUser?: any
  ) => Promise<void>;
  setPinnedMessage: (text: string) => void;
  setActiveSideTab: (tab: 'chat' | 'members' | 'voice') => void;
  setCurrentTimeLocal: (time: number) => void;
  setDurationLocal: (dur: number) => void;
  clearAllRooms: () => void;
}

const DEFAULT_ROOM: WatchPartyRoom = {
  id: 'room-dune-2',
  title: 'Phòng Xem Chung: Dune 2 (Đêm Cuối Tuần)',
  movieId: 'dune-2',
  movieTitle: 'Dune: Hành Tinh Cát - Phần 2',
  streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  hostName: 'Minh Hoàng (VIP Host)',
  hostId: 'host-minhhoang',
  activeCount: 4,
  maxCount: 20,
  currentTime: '02:25',
  currentTimeSeconds: 145,
  coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN2LMdr7k6t28pixcqtV_DU65R9YZc6w1Fa_ofgP4IwbnJCRwg4sKZs9nvQ40M0rQPiGuXT_whrQdyb2iltXdCebb-KJylFIFvezB82DegiDGQyGgkTY98eVWk2seEB3-zres6kWJn-SZG_yTH0x0oPrzHFeDIkA6g2zyAlSE5qVt9uHONADDErNAaIEAn92dssTytRm4AFrQAfOeIvPpapO6-EbMVeGb1VJ_UXDyWlKXs68gnjWjb3w',
  isLive: true,
  hostLock: true,
  isPlaying: true,
  pinnedMessage: 'Chào mừng cả nhà! Bật loa to lên để trải nghiệm âm thanh Dolby Atmos nào 🔥',
  participants: [
    { id: 'host-minhhoang', name: 'Minh Hoàng (Host)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', isVip: true, isHost: true, isMicMuted: true },
    { id: 'p2', name: 'Bảo Ngọc 👑', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', isVip: true, isHost: false, isMicMuted: true },
    { id: 'p3', name: 'Tuấn Anh', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isVip: false, isHost: false, isMicMuted: true },
    { id: 'p4', name: 'Khánh Linh', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', isVip: true, isHost: false, isMicMuted: true }
  ]
};

const DEFAULT_ROOMS: WatchPartyRoom[] = [
  DEFAULT_ROOM,
  {
    id: 'room-oppenheimer',
    title: 'Phòng Chiếu IMAX 4K: Oppenheimer',
    movieId: 'oppenheimer',
    movieTitle: 'Oppenheimer',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    hostName: 'Denis Trần (VIP Host)',
    hostId: 'host-denis',
    activeCount: 3,
    maxCount: 20,
    currentTime: '05:20',
    currentTimeSeconds: 320,
    coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuG3txMZplmamoKp2e9nRbwOyR9jS12jeDZuTNiqg-V9gcwC7KEmAo5jwkIAR6LEPIL5zrkWkx1Te6QYoKBLDvyXQ9NU0XKcXASaziWS9XoNGw1gxEJpmC0YSssjjNNnbkM9l4-xH_OKkI6IEqS5QJFpNSfO54GBuQvYyGbH9viRRvJ83f5l8ri3J1Eh7DFrWYiV0hqbKXcl4jDVUo7SX36hpGlcuANFHwvkqy5mHXV8WsG3tKcp8CZg',
    isLive: true,
    hostLock: true,
    isPlaying: true,
    pinnedMessage: 'Chào mừng các bạn đến phòng chiếu IMAX 4K Oppenheimer!',
    participants: [
      { id: 'host-denis', name: 'Denis Trần (VIP Host)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isVip: true, isHost: true, isMicMuted: true },
      { id: 'p-opp-1', name: 'Thanh Thảo', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', isVip: true, isHost: false, isMicMuted: true },
      { id: 'p-opp-2', name: 'Quốc Huy', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', isVip: false, isHost: false, isMicMuted: true }
    ]
  },
  {
    id: 'room-anime-live',
    title: 'Phòng Anime: Your Name (Kimi no Na wa)',
    movieId: 'your-name',
    movieTitle: 'Your Name (Tên Cậu Là Gì?)',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    hostName: 'Mori Anime (VIP Host)',
    hostId: 'host-mori',
    activeCount: 5,
    maxCount: 30,
    currentTime: '12:40',
    currentTimeSeconds: 760,
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
    isLive: true,
    hostLock: false,
    isPlaying: true,
    pinnedMessage: 'Phòng xem anime âm thanh vòm cực đã! Thảo luận văn minh nhé cả nhà!',
    participants: [
      { id: 'host-mori', name: 'Mori Anime (VIP Host)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', isVip: true, isHost: true, isMicMuted: true },
      { id: 'p-ani-1', name: 'Anh Khoa', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', isVip: true, isHost: false, isMicMuted: true }
    ]
  }
];

export const useWatchPartyStore = create<WatchPartyState>((set, get) => ({
  rooms: DEFAULT_ROOMS,
  currentRoom: null,
  participants: DEFAULT_ROOM.participants || [],
  chatMessages: [],
  reactions: [],
  isPlaying: true,
  currentTime: 145,
  duration: 64 * 60,
  isHost: false,
  hostLock: true,
  isMicMuted: true,
  isVideoMuted: false,
  isConnected: true,
  latencyMs: 18,
  pinnedMessage: 'Chào mừng cả nhà! Bật loa to lên để trải nghiệm âm thanh Dolby Atmos nào 🔥',
  activeSideTab: 'chat',
  isRoomClosed: false,
  roomClosedReason: null,
  resetRoomClosed: () => set({ isRoomClosed: false, roomClosedReason: null }),

  sseSource: null,
  broadcastChannel: null,
  syncTimer: null,
  lastRemoteSyncTime: 0,

  loadRooms: async () => {
    try {
      const res = await apiClient.get<any>('/watchparty/rooms');
      const incoming = Array.isArray(res?.data?.rooms)
        ? res.data.rooms
        : (Array.isArray(res?.data) ? res.data : null);

      if (Array.isArray(incoming)) {
        set({ rooms: incoming });
        return incoming;
      }
    } catch (_err) {
      // Fallback
    }
    const current = get().rooms;
    return current;
  },

  clearAllRooms: () => {
    set({ rooms: [] });
  },

  createRoom: async (input: CreateRoomInput, currentUser: any) => {
    const isVipUser = Boolean(
      currentUser && (
        currentUser.isVip ||
        currentUser.vipTier?.toUpperCase().includes('VIP') ||
        currentUser.roles?.some((r: string) => r.toUpperCase().includes('VIP') || r.toUpperCase().includes('ADMIN'))
      )
    );

    if (!isVipUser) {
      throw new Error('Chỉ tài khoản thành viên VIP mới có quyền tạo phòng xem chung.');
    }

    const userPayload = {
      id: currentUser?.id || 'usr-' + Date.now(),
      name: currentUser?.username || currentUser?.name || 'Bạn (Host VIP)',
      avatar: currentUser?.avatar || '/default-avatar.png',
      isVip: true
    };

    const hostParticipant: WatchPartyParticipant = {
      id: userPayload.id,
      name: userPayload.name,
      avatar: userPayload.avatar,
      isVip: userPayload.isVip,
      isHost: true,
      isMicMuted: true
    };

    let newRoom: WatchPartyRoom | null = null;

    try {
      const res = await apiClient.post<any>('/watchparty/rooms', {
        ...input,
        hostName: userPayload.name,
        hostId: userPayload.id,
        isVip: true
      });
      const roomData = res?.data?.room || (res?.data?.id ? res.data : null);
      if (roomData && roomData.id) {
        newRoom = roomData;
      }
    } catch (_e) {
      // Offline fallback creation
    }

    if (!newRoom) {
      newRoom = {
        id: 'room-' + (input.movieId || 'party') + '-' + Date.now().toString().slice(-4),
        title: input.title || `Phòng xem: ${input.movieTitle || 'CineStreams'}`,
        movieId: input.movieId || 'dune-2',
        movieTitle: input.movieTitle || 'Dune: Hành Tinh Cát - Phần 2',
        streamUrl: input.streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        hostName: userPayload.name,
        hostId: userPayload.id,
        activeCount: 1,
        maxCount: input.maxCount || 20,
        currentTime: '00:00',
        currentTimeSeconds: 0,
        coverImage: input.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop',
        isLive: true,
        hostLock: input.hostLock !== undefined ? input.hostLock : true,
        isPlaying: true,
        pinnedMessage: 'Phòng xem phim mới được tạo. Chúc bạn xem phim vui vẻ!'
      };
    }

    const initialSysMsg: ChatMessage = {
      id: 'sys-create-' + Date.now(),
      user: 'Hệ Thống CineStreams',
      avatar: '/default-avatar.png',
      isVip: true,
      isHost: false,
      text: `Phòng xem chung [${newRoom.title}] đã sẵn sàng. Mời bạn bè cùng xem ngay!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    set((state) => ({
      rooms: [newRoom!, ...state.rooms.filter((r) => r.id !== newRoom!.id)],
      currentRoom: newRoom,
      participants: [hostParticipant],
      chatMessages: [initialSysMsg],
      isHost: true,
      isPlaying: true,
      currentTime: 0,
      hostLock: newRoom!.hostLock ?? true,
      pinnedMessage: newRoom!.pinnedMessage || 'Chào mừng các bạn!'
    }));

    return newRoom;
  },

  fetchRoomSync: async (roomId: string, _currentUser?: any) => {
    try {
      const res = await apiClient.get<any>(`/watchparty/rooms/${roomId}`);
      const room = res?.data?.room || (res?.data?.id ? res.data : null);
      if (room && room.id) {
        set((state) => {
          const localMsgs = state.chatMessages;
          const remoteMsgs: ChatMessage[] = room.chatMessages || [];
          const mergedMsgs = [...localMsgs];
          remoteMsgs.forEach((rm) => {
            if (!mergedMsgs.some((lm) => lm.id === rm.id)) {
              mergedMsgs.push(rm);
            }
          });

          const remoteParticipants: WatchPartyParticipant[] = room.participants || [];

          return {
            currentRoom: {
              ...(state.currentRoom || room),
              ...room,
              movieId: room.movieId || state.currentRoom?.movieId,
              movieTitle: room.movieTitle || state.currentRoom?.movieTitle,
              streamUrl: room.streamUrl || state.currentRoom?.streamUrl,
              coverImage: room.coverImage || state.currentRoom?.coverImage,
              activeCount: remoteParticipants.length || room.activeCount || state.currentRoom?.activeCount || 1
            },
            participants: remoteParticipants.length > 0 ? remoteParticipants : state.participants,
            chatMessages: mergedMsgs,
            hostLock: room.hostLock !== undefined ? room.hostLock : state.hostLock,
            pinnedMessage: room.pinnedMessage || state.pinnedMessage,
            isConnected: true
          };
        });
      }
    } catch (_e) {
      // ignore
    }
  },

  joinRoom: async (roomId: string, currentUser: any) => {
    // 1. Dọn dẹp kết nối và timer cũ
    const { sseSource: oldSse, broadcastChannel: oldBc, syncTimer: oldTimer } = get();
    if (oldSse) oldSse.close();
    if (oldBc) oldBc.close();
    if (oldTimer) clearInterval(oldTimer);

    const isVipUser = Boolean(
      currentUser && (
        currentUser.isVip ||
        currentUser.vipTier?.toUpperCase().includes('VIP') ||
        currentUser.roles?.some((r: string) => r.toUpperCase().includes('VIP') || r.toUpperCase().includes('ADMIN'))
      )
    );

    const userPayload = {
      id: currentUser?.id || 'usr-' + (Math.random() * 1000 | 0),
      name: currentUser?.username || currentUser?.name || 'Khách',
      avatar: currentUser?.avatar || '/default-avatar.png',
      isVip: isVipUser
    };

    // 2. Chuyển ngay currentRoom sang phòng mục tiêu và reset tin nhắn chat để phòng xem độc lập hoàn toàn
    const existing = get().rooms.find((r) => r.id === roomId);
    const isSelfHost = existing ? (existing.hostId === userPayload.id || existing.hostName === userPayload.name) : false;

    const selfParticipant: WatchPartyParticipant = {
      id: userPayload.id,
      name: userPayload.name,
      avatar: userPayload.avatar,
      isVip: userPayload.isVip,
      isHost: isSelfHost,
      isMicMuted: true
    };

    const hostParticipant: WatchPartyParticipant | null = (existing && !isSelfHost) ? {
      id: existing.hostId || 'host-' + existing.id,
      name: existing.hostName || 'Chủ phòng',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isVip: true,
      isHost: true,
      isMicMuted: true
    } : null;

    const baseParticipants: WatchPartyParticipant[] = hostParticipant
      ? [hostParticipant, selfParticipant]
      : [selfParticipant];

    const roomParticipants = existing?.participants && existing.participants.length > 0
      ? existing.participants
      : baseParticipants;

    const mergedParticipants = roomParticipants.some((p) => p.id === selfParticipant.id || p.name === selfParticipant.name)
      ? roomParticipants
      : [...roomParticipants, selfParticipant];

    set({
      chatMessages: [],
      reactions: [],
      participants: mergedParticipants,
      currentRoom: existing ? { ...existing, activeCount: Math.max(existing.activeCount || 1, mergedParticipants.length) } : null,
      isHost: isSelfHost,
      hostLock: existing?.hostLock ?? true,
      pinnedMessage: existing?.pinnedMessage || 'Chào mừng các bạn!'
    });

    // 2.5. Khởi tạo kết nối Socket.IO thời gian thực
    try {
      const socket = watchPartySocket.connect();
      watchPartySocket.joinRoom(roomId, userPayload);

      socket.off('sync_play');
      socket.on('sync_play', (data: any) => {
        set({ isPlaying: true, currentTime: data.currentTime, isConnected: true });
      });

      socket.off('sync_pause');
      socket.on('sync_pause', (data: any) => {
        set({ isPlaying: false, currentTime: data.currentTime, isConnected: true });
      });

      socket.off('sync_seek');
      socket.on('sync_seek', (data: any) => {
        set({ currentTime: data.currentTime, isConnected: true });
      });

      socket.off('sync_time');
      socket.on('sync_time', (data: any) => {
        if (!get().isHost) {
          const cur = get().currentTime;
          if (Math.abs(cur - data.currentTime) > 1.2) {
            set({ currentTime: data.currentTime, isPlaying: data.isPlaying });
          }
        }
      });

      socket.off('chat_message');
      socket.on('chat_message', (data: any) => {
        if (data.message && !get().chatMessages.some((m) => m.id === data.message.id)) {
          set((s) => ({ chatMessages: [...s.chatMessages, data.message] }));
        }
      });

      socket.off('reaction');
      socket.on('reaction', (data: any) => {
        if (data.reaction) {
          const r = data.reaction;
          set((s) => ({
            reactions: [...s.reactions, { id: r.id, emoji: r.emoji, x: r.x, user: r.user }]
          }));
          setTimeout(() => get().removeReaction(r.id), 2500);
        }
      });

      socket.off('participant_joined');
      socket.on('participant_joined', (data: any) => {
        if (data.participant) {
          set((s) => {
            const filtered = s.participants.filter((p) => p.id !== data.participant.id);
            const newMsgs = data.systemMessage
              ? [...s.chatMessages, data.systemMessage]
              : s.chatMessages;
            return {
              participants: [...filtered, data.participant],
              chatMessages: newMsgs,
              currentRoom: s.currentRoom
                ? { ...s.currentRoom, activeCount: data.activeCount || filtered.length + 1 }
                : null
            };
          });
        }
      });

      socket.off('participant_left');
      socket.on('participant_left', (data: any) => {
        if (data.userId) {
          set((s) => ({
            participants: s.participants.filter((p) => p.id !== data.userId),
            chatMessages: data.systemMessage ? [...s.chatMessages, data.systemMessage] : s.chatMessages,
            currentRoom: s.currentRoom
              ? { ...s.currentRoom, activeCount: Math.max(1, data.activeCount || s.participants.length - 1) }
              : null
          }));
        }
      });

      socket.off('host_lock_changed');
      socket.on('host_lock_changed', (data: any) => {
        set({ hostLock: data.hostLock });
      });

      socket.off('mic_status_changed');
      socket.on('mic_status_changed', (data: any) => {
        set((s) => ({
          participants: s.participants.map((p) =>
            p.id === data.userId || (data.userName && p.name === data.userName)
              ? { ...p, isMicMuted: data.isMicMuted }
              : p
          )
        }));
      });

      socket.off('movie_changed');
      socket.on('movie_changed', (data: any) => {
        if (data.room) {
          const r = data.room;
          set((s) => ({
            currentRoom: {
              ...(s.currentRoom || r),
              ...r,
              streamUrl: r.streamUrl,
              movieTitle: r.movieTitle,
              movieId: r.movieId,
              coverImage: r.coverImage || s.currentRoom?.coverImage
            },
            currentTime: 0,
            isPlaying: true,
            chatMessages: data.systemMessage ? [...s.chatMessages, data.systemMessage] : s.chatMessages
          }));
        }
      });

      socket.off('room_closed');
      socket.on('room_closed', (data: any) => {
        set((state) => ({
          isRoomClosed: true,
          roomClosedReason: data.message || 'Chủ phòng đã thoát và đóng phòng xem chung. Toàn bộ đoạn chat và phòng đã được xóa.',
          isConnected: false,
          chatMessages: [],
          reactions: [],
          currentRoom: null,
          rooms: state.rooms.filter((r) => r.id !== roomId && r.id !== state.currentRoom?.id)
        }));
      });

      socket.off('initial_state');
      socket.on('initial_state', (data: any) => {
        if (data.room) {
          const r = data.room;
          const isHost = r.hostId === userPayload.id || r.hostName === userPayload.name;
          set({
            currentRoom: r,
            participants: r.participants || [],
            chatMessages: r.chatMessages || [],
            isPlaying: r.isPlaying ?? true,
            currentTime: r.currentTimeSeconds || 0,
            hostLock: r.hostLock ?? true,
            pinnedMessage: r.pinnedMessage || '',
            isHost,
            isConnected: true
          });
        }
      });
    } catch (_socketErr) {
      console.warn('[WatchParty] Socket.IO connection fallback');
    }

    // 3. Multi-tab local channel (BroadcastChannel)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('cinestreams_wp_' + roomId);
      bc.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'PLAY') {
          set({ isPlaying: true, currentTime: data.currentTime });
        } else if (data.type === 'PAUSE') {
          set({ isPlaying: false, currentTime: data.currentTime });
        } else if (data.type === 'SEEK') {
          set({ currentTime: data.currentTime });
        } else if (data.type === 'SYNC_TIME') {
          const current = get().currentTime;
          if (Math.abs(current - data.currentTime) > 1.0) {
            set({ currentTime: data.currentTime, isPlaying: data.isPlaying });
          }
        } else if (data.type === 'CHAT') {
          if (!get().chatMessages.some((m) => m.id === data.message.id)) {
            set((s) => ({ chatMessages: [...s.chatMessages, data.message] }));
          }
        } else if (data.type === 'REACTION') {
          get().triggerReaction(data.reaction?.emoji || '❤️');
        } else if (data.type === 'HOST_LOCK_CHANGED') {
          set({ hostLock: data.hostLock });
        } else if (data.type === 'MIC_STATUS_CHANGED' || data.type === 'MIC_CHANGED') {
          set((s) => ({
            participants: s.participants.map((p) =>
              p.id === data.userId || (data.userName && p.name === data.userName)
                ? { ...p, isMicMuted: data.isMicMuted }
                : p
            )
          }));
        } else if (data.type === 'MOVIE_CHANGED') {
          set((s) => ({
            currentRoom: s.currentRoom
              ? {
                  ...s.currentRoom,
                  movieId: data.movieId || s.currentRoom.movieId,
                  movieTitle: data.movieTitle || s.currentRoom.movieTitle,
                  streamUrl: data.streamUrl || s.currentRoom.streamUrl,
                  coverImage: data.coverImage || s.currentRoom.coverImage,
                  currentTimeSeconds: 0,
                  currentTime: '00:00'
                }
              : null,
            currentTime: 0,
            isPlaying: true,
            chatMessages: data.systemMessage
              ? [...s.chatMessages, data.systemMessage]
              : s.chatMessages
          }));
        } else if (data.type === 'ROOM_CLOSED') {
          set((state) => ({
            isRoomClosed: true,
            roomClosedReason: data.message || 'Chủ phòng đã thoát và đóng phòng xem chung này. Toàn bộ đoạn chat và phòng đã được xóa.',
            isConnected: false,
            chatMessages: [],
            reactions: [],
            currentRoom: null,
            rooms: state.rooms.filter((r) => r.id !== roomId && r.id !== state.currentRoom?.id)
          }));
        }
      };
    } catch (_e) {
      // BroadcastChannel not available in environment
    }

    // 4. Connect to Server-Sent Events (SSE)
    let sse: EventSource | null = null;
    try {
      const sseUrl = `/api/watchparty/rooms/${roomId}/events`;
      sse = new EventSource(sseUrl);

      sse.onopen = () => {
        set({ isConnected: true });
      };

      sse.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (!payload || !payload.type) return;

          switch (payload.type) {
            case 'INITIAL_STATE':
              if (payload.room) {
                const r = payload.room;
                const isHost = r.hostId === userPayload.id || r.hostName === userPayload.name;
                set({
                  currentRoom: r,
                  participants: r.participants || [],
                  chatMessages: r.chatMessages || [],
                  isPlaying: r.isPlaying ?? true,
                  currentTime: r.currentTimeSeconds || 0,
                  hostLock: r.hostLock ?? true,
                  pinnedMessage: r.pinnedMessage || '',
                  isHost
                });
              }
              break;

            case 'PLAY':
              set({ isPlaying: true, currentTime: payload.currentTime });
              break;

            case 'PAUSE':
              set({ isPlaying: false, currentTime: payload.currentTime });
              break;

            case 'SEEK':
              set({ currentTime: payload.currentTime });
              break;

            case 'SYNC_TIME':
              if (!get().isHost) {
                const cur = get().currentTime;
                if (Math.abs(cur - payload.currentTime) > 1.2) {
                  set({ currentTime: payload.currentTime, isPlaying: payload.isPlaying });
                }
              }
              break;

            case 'CHAT':
              if (payload.message && !get().chatMessages.some((m) => m.id === payload.message.id)) {
                set((s) => ({ chatMessages: [...s.chatMessages, payload.message] }));
              }
              break;

            case 'REACTION':
              if (payload.reaction) {
                const r = payload.reaction;
                set((s) => ({
                  reactions: [...s.reactions, { id: r.id, emoji: r.emoji, x: r.x, user: r.user }]
                }));
                setTimeout(() => get().removeReaction(r.id), 2500);
              }
              break;

            case 'PARTICIPANT_JOINED':
              if (payload.participant) {
                set((s) => {
                  const filtered = s.participants.filter((p) => p.id !== payload.participant.id);
                  const newMsgs = payload.systemMessage
                    ? [...s.chatMessages, payload.systemMessage]
                    : s.chatMessages;
                  return {
                    participants: [...filtered, payload.participant],
                    chatMessages: newMsgs,
                    currentRoom: s.currentRoom
                      ? { ...s.currentRoom, activeCount: (payload.activeCount || filtered.length + 1) }
                      : null
                  };
                });
              }
              break;

            case 'PARTICIPANT_LEFT':
              if (payload.userId) {
                set((s) => ({
                  participants: s.participants.filter((p) => p.id !== payload.userId),
                  chatMessages: payload.systemMessage ? [...s.chatMessages, payload.systemMessage] : s.chatMessages,
                  currentRoom: s.currentRoom
                    ? { ...s.currentRoom, activeCount: Math.max(1, (payload.activeCount || s.participants.length - 1)) }
                    : null
                }));
              }
              break;

            case 'HOST_LOCK_CHANGED':
              set({ hostLock: payload.hostLock });
              break;

            case 'MIC_STATUS_CHANGED':
            case 'MIC_CHANGED':
              set((s) => ({
                participants: s.participants.map((p) =>
                  p.id === payload.userId || (payload.userName && p.name === payload.userName)
                    ? { ...p, isMicMuted: payload.isMicMuted }
                    : p
                )
              }));
              break;

            case 'MOVIE_CHANGED':
              if (payload.room) {
                const r = payload.room;
                set((s) => ({
                  currentRoom: {
                    ...(s.currentRoom || r),
                    ...r,
                    streamUrl: r.streamUrl,
                    movieTitle: r.movieTitle,
                    movieId: r.movieId,
                    coverImage: r.coverImage || s.currentRoom?.coverImage
                  },
                  currentTime: 0,
                  isPlaying: true,
                  chatMessages: payload.systemMessage
                    ? [...s.chatMessages, payload.systemMessage]
                    : s.chatMessages
                }));
              } else if (payload.streamUrl) {
                set((s) => ({
                  currentRoom: s.currentRoom
                    ? {
                        ...s.currentRoom,
                        movieId: payload.movieId || s.currentRoom.movieId,
                        movieTitle: payload.movieTitle || s.currentRoom.movieTitle,
                        streamUrl: payload.streamUrl,
                        coverImage: payload.coverImage || s.currentRoom.coverImage
                      }
                    : null,
                  currentTime: 0,
                  isPlaying: true,
                  chatMessages: payload.systemMessage
                    ? [...s.chatMessages, payload.systemMessage]
                    : s.chatMessages
                }));
              }
              break;

            case 'PINNED_MESSAGE_CHANGED':
              set({ pinnedMessage: payload.pinnedMessage });
              break;

            case 'ROOM_CLOSED':
              set((state) => ({
                isRoomClosed: true,
                roomClosedReason: payload.message || 'Chủ phòng đã thoát và đóng phòng xem chung. Toàn bộ đoạn chat và phòng đã được xóa.',
                isConnected: false,
                chatMessages: [],
                reactions: [],
                currentRoom: null,
                rooms: state.rooms.filter((r) => r.id !== roomId && r.id !== state.currentRoom?.id)
              }));
              break;

            case 'PING':
              set({ latencyMs: Math.floor(Math.random() * 8 + 14) });
              break;
          }
        } catch (_err) {
          // JSON parse error
        }
      };

      sse.onerror = () => {
        set({ isConnected: false });
      };
    } catch (_e) {
      // SSE not supported
    }

    // 5. Polling sync timer mỗi 1800ms
    const syncTimer = setInterval(() => {
      get().fetchRoomSync(roomId, currentUser);
    }, 1800);

    set({ sseSource: sse, broadcastChannel: bc, syncTimer });

    // 6. Gửi JOIN action lên server và fetch state ngay lập tức
    try {
      await apiClient.post(`/watchparty/rooms/${roomId}/action`, {
        type: 'JOIN',
        user: userPayload
      });
      await get().fetchRoomSync(roomId, currentUser);
    } catch (_err) {
      const selfParticipant: WatchPartyParticipant = {
        id: userPayload.id,
        name: userPayload.name,
        avatar: userPayload.avatar,
        isVip: userPayload.isVip,
        isHost: false,
        isMicMuted: true
      };
      set((s) => ({
        participants: [...s.participants.filter((p) => p.id !== selfParticipant.id), selfParticipant]
      }));
    }
  },

  leaveRoom: async (currentUser?: any) => {
    // Nếu Chủ Phòng thoát thì tự động đóng và xóa luôn phòng cùng lịch sử chat
    if (get().isHost) {
      await get().closeRoom(currentUser);
      return;
    }

    const { sseSource, broadcastChannel, syncTimer, currentRoom } = get();
    if (sseSource) sseSource.close();
    if (broadcastChannel) broadcastChannel.close();
    if (syncTimer) clearInterval(syncTimer);

    if (currentUser) {
      watchPartySocket.leaveRoom(currentRoom?.id, {
        id: currentUser.id,
        name: currentUser.username || currentUser.name || 'Thành viên'
      });
    }

    if (currentRoom && currentUser) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, {
        type: 'LEAVE',
        user: {
          id: currentUser.id,
          name: currentUser.username || currentUser.name || 'Thành viên'
        }
      }).catch(() => {});
    }

    set({
      sseSource: null,
      broadcastChannel: null,
      syncTimer: null,
      isConnected: false,
      chatMessages: [],
      reactions: [],
      currentRoom: null,
      isHost: false
    });
  },

  closeRoom: async (currentUser?: any) => {
    const { sseSource, broadcastChannel, syncTimer, currentRoom } = get();
    const targetRoomId = currentRoom?.id;

    if (sseSource) sseSource.close();
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'ROOM_CLOSED',
        roomId: targetRoomId,
        message: 'Chủ phòng đã thoát và đóng phòng xem chung. Toàn bộ đoạn chat và phòng đã được xóa hoàn toàn.'
      });
      broadcastChannel.close();
    }
    if (syncTimer) clearInterval(syncTimer);

    // Socket.IO close room broadcast
    watchPartySocket.closeRoom('Chủ phòng đã thoát và đóng phòng xem chung. Kênh chat và phòng đã bị xóa.');

    if (currentRoom) {
      try {
        await apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, {
          type: 'CLOSE_ROOM',
          closeRoom: true,
          user: {
            id: currentUser?.id,
            name: currentUser?.username || currentUser?.name || 'Chủ phòng',
            isHost: true
          }
        });
      } catch (_e) {}
    }

    set((state) => ({
      sseSource: null,
      broadcastChannel: null,
      syncTimer: null,
      isConnected: false,
      currentRoom: null,
      isHost: false,
      chatMessages: [], // Xóa sạch vĩnh viễn tin nhắn chat trong thời gian phòng hoạt động
      reactions: [],
      rooms: state.rooms.filter((r) => r.id !== targetRoomId && r.id !== state.currentRoom?.id) // Xóa phòng hoàn toàn
    }));
  },

  sendPlay: (time: number, currentUser?: any) => {
    const { currentRoom, broadcastChannel } = get();
    set({ isPlaying: true, currentTime: time });

    const userPayload = currentUser ? { id: currentUser.id, name: currentUser.username || currentUser.name } : undefined;
    const payload = {
      type: 'PLAY',
      currentTime: time,
      user: userPayload
    };

    // Socket.IO sync
    watchPartySocket.sendPlay(time, userPayload);

    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, payload).catch(() => {});
    }
  },

  sendPause: (time: number, currentUser?: any) => {
    const { currentRoom, broadcastChannel } = get();
    set({ isPlaying: false, currentTime: time });

    const userPayload = currentUser ? { id: currentUser.id, name: currentUser.username || currentUser.name } : undefined;
    const payload = {
      type: 'PAUSE',
      currentTime: time,
      user: userPayload
    };

    // Socket.IO sync
    watchPartySocket.sendPause(time, userPayload);

    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, payload).catch(() => {});
    }
  },

  sendSeek: (time: number, currentUser?: any) => {
    const { currentRoom, broadcastChannel } = get();
    set({ currentTime: time });

    const userPayload = currentUser ? { id: currentUser.id, name: currentUser.username || currentUser.name } : undefined;
    const payload = {
      type: 'SEEK',
      currentTime: time,
      user: userPayload
    };

    // Socket.IO sync
    watchPartySocket.sendSeek(time, userPayload);

    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, payload).catch(() => {});
    }
  },

  sendSyncBeacon: (time: number, isPlaying: boolean) => {
    const { currentRoom, broadcastChannel, isHost } = get();
    if (!isHost) return;

    // Socket.IO heartbeat sync
    watchPartySocket.sendSyncBeacon(time, isPlaying);

    const payload = { type: 'SYNC_TIME', currentTime: time, isPlaying };
    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, payload).catch(() => {});
    }
  },

  sendMessage: (text: string, isSpoiler = false, currentUser?: any) => {
    if (!text.trim()) return;
    const { currentRoom, broadcastChannel, chatMessages } = get();

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const user = currentUser?.username || currentUser?.name || 'Bạn (VIP)';
    const avatar = currentUser?.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKI3gRB2-ajZZGcKyE5j9o_QEHEa3jFKNQP2LDRuci6XUPZo7WjzRr67sHpmExkSNaTWfkgRQ-Itw30N5OIN9GZoYP9E-htmJ2SQsH9tVP6aCpsRVOaVnI8ltteCYpTHRUWXojhbkoUTwS8XpkDIHRXmFj83yGCFvjkLDR6vWk8GMveFcp6CcrbT50VV2sHcmj2ghAuV1CiQX4kVprpH10y-oErnTIfsTRLHwLctzwqvDUQAe87wgqBg';

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now() + Math.random().toString(36).substring(2, 6),
      user,
      userId: currentUser?.id,
      avatar,
      isVip: currentUser?.isVip ?? true,
      isHost: get().isHost,
      text: text.trim(),
      time,
      isSpoiler
    };

    set({ chatMessages: [...chatMessages, newMsg] });

    // Socket.IO sync
    watchPartySocket.sendMessage(newMsg, {
      id: currentUser?.id || 'usr-self',
      name: user,
      avatar,
      isVip: newMsg.isVip,
      isHost: newMsg.isHost
    });

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'CHAT', message: newMsg });
    }
    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, {
        type: 'CHAT',
        message: newMsg,
        user: { id: currentUser?.id, name: user, avatar, isVip: newMsg.isVip, isHost: newMsg.isHost }
      }).catch(() => {});
    }
  },

  triggerReaction: (emoji: string, currentUser?: any) => {
    const { currentRoom, broadcastChannel } = get();
    const id = 'react-' + Date.now() + Math.random();
    const x = Math.random() * 75 + 15;
    const reaction: WatchPartyReaction = {
      id,
      emoji,
      x,
      user: currentUser?.username || currentUser?.name || 'Bạn'
    };

    set((state) => ({
      reactions: [...state.reactions, reaction]
    }));

    // Socket.IO sync
    watchPartySocket.triggerReaction(emoji, {
      id: currentUser?.id || 'usr-self',
      name: reaction.user || 'Bạn'
    });

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'REACTION', reaction });
    }
    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, {
        type: 'REACTION',
        emoji,
        user: { name: reaction.user }
      }).catch(() => {});
    }

    setTimeout(() => {
      get().removeReaction(id);
    }, 2500);
  },

  removeReaction: (id: string) => {
    set((state) => ({
      reactions: state.reactions.filter((r) => r.id !== id)
    }));
  },

  toggleMic: (currentUser?: any) => {
    const nextMic = !get().isMicMuted;
    const userPayload = {
      id: currentUser?.id || 'usr-self',
      name: currentUser?.username || currentUser?.name || 'Bạn'
    };

    set((state) => ({
      isMicMuted: nextMic,
      participants: state.participants.map((p) =>
        p.id === userPayload.id || p.name === userPayload.name || (state.isHost && p.isHost)
          ? { ...p, isMicMuted: nextMic }
          : p
      )
    }));

    // Socket.IO sync
    watchPartySocket.toggleMic(userPayload.id, nextMic, userPayload.name);

    const { currentRoom, broadcastChannel } = get();
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'MIC_STATUS_CHANGED',
        userId: userPayload.id,
        userName: userPayload.name,
        isMicMuted: nextMic
      });
    }

    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, {
        type: 'TOGGLE_MIC',
        isMicMuted: nextMic,
        user: userPayload
      }).catch(() => {});
    }
  },

  changeMovie: async (
    movieData: {
      movieId: string;
      movieTitle: string;
      streamUrl: string;
      coverImage?: string;
      episodeTitle?: string;
    },
    currentUser?: any
  ) => {
    const { currentRoom, broadcastChannel } = get();
    if (!currentRoom) return;

    const hostName = currentUser?.username || currentUser?.name || currentRoom.hostName || 'Chủ phòng';
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const displayTitle = movieData.episodeTitle
      ? `${movieData.movieTitle} (${movieData.episodeTitle})`
      : movieData.movieTitle;

    const sysMsg: ChatMessage = {
      id: 'sys-movie-' + Date.now(),
      user: 'Hệ Thống CineStreams',
      avatar: '/default-avatar.png',
      isVip: true,
      isHost: false,
      text: `${hostName} đã đổi sang phim: ${displayTitle}. Toàn bộ phòng đã đồng bộ!`,
      time: timeNow
    };

    set((state) => ({
      currentRoom: state.currentRoom
        ? {
            ...state.currentRoom,
            movieId: movieData.movieId,
            movieTitle: displayTitle,
            streamUrl: movieData.streamUrl,
            coverImage: movieData.coverImage || state.currentRoom.coverImage,
            currentTimeSeconds: 0,
            currentTime: '00:00',
            isPlaying: true
          }
        : null,
      rooms: state.rooms.map((r) =>
        r.id === currentRoom.id
          ? {
              ...r,
              movieId: movieData.movieId,
              movieTitle: displayTitle,
              streamUrl: movieData.streamUrl,
              coverImage: movieData.coverImage || r.coverImage
            }
          : r
      ),
      currentTime: 0,
      isPlaying: true,
      chatMessages: [...state.chatMessages, sysMsg]
    }));

    // Socket.IO sync
    watchPartySocket.changeMovie(
      {
        movieId: movieData.movieId,
        movieTitle: displayTitle,
        streamUrl: movieData.streamUrl,
        coverImage: movieData.coverImage
      },
      { id: currentUser?.id, name: hostName }
    );

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'MOVIE_CHANGED',
        movieId: movieData.movieId,
        movieTitle: displayTitle,
        streamUrl: movieData.streamUrl,
        coverImage: movieData.coverImage,
        systemMessage: sysMsg
      });
    }

    try {
      await apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, {
        type: 'CHANGE_MOVIE',
        movieId: movieData.movieId,
        movieTitle: displayTitle,
        streamUrl: movieData.streamUrl,
        coverImage: movieData.coverImage,
        episodeTitle: movieData.episodeTitle,
        user: { id: currentUser?.id, name: hostName }
      });
    } catch (_err) {
      // offline fallback
    }
  },

  toggleVideo: () => set((state) => ({ isVideoMuted: !state.isVideoMuted })),

  toggleHostLock: () => {
    const nextLock = !get().hostLock;
    set({ hostLock: nextLock });

    // Socket.IO sync
    watchPartySocket.toggleHostLock(nextLock);

    const { currentRoom, broadcastChannel } = get();
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'HOST_LOCK_CHANGED', hostLock: nextLock });
    }
    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, {
        type: 'TOGGLE_LOCK',
        hostLock: nextLock
      }).catch(() => {});
    }
  },

  setPinnedMessage: (text: string) => {
    set({ pinnedMessage: text });
    const { currentRoom } = get();
    if (currentRoom) {
      apiClient.post(`/watchparty/rooms/${currentRoom.id}/action`, {
        type: 'PIN_MESSAGE',
        pinnedMessage: text
      }).catch(() => {});
    }
  },

  setActiveSideTab: (tab) => set({ activeSideTab: tab }),
  setCurrentTimeLocal: (time) => set({ currentTime: time }),
  setDurationLocal: (dur) => set({ duration: dur })
}));
