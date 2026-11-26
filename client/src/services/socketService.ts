/**
 * CineStreams WatchParty Socket.IO Realtime Service
 * 
 * Quản lý kết nối Socket.IO thời gian thực giữa các người xem trong phòng WatchParty:
 * - Đồng bộ tức thời Play / Pause / Seek với độ trễ tính bằng mili-giây.
 * - Heartbeat Time Sync để điều chỉnh độ lệch khung hình (Frame Drift) giữa Host và Viewers.
 * - Chat thời gian thực, thả reaction emoji, quản lý micro và quyền chủ phòng (Host Lock).
 */

import { io, Socket } from 'socket.io-client';

export interface SocketUserPayload {
  id: string;
  name: string;
  avatar?: string;
  isVip?: boolean;
  isHost?: boolean;
}

export interface SyncVideoPayload {
  currentTime: number;
  isPlaying?: boolean;
  sender?: string;
  user?: SocketUserPayload;
  timestamp?: number;
}

export class WatchPartySocketService {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private currentUser: SocketUserPayload | null = null;

  /**
   * Khởi tạo kết nối Socket.IO
   */
  public connect(url?: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketUrl = url || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log(`[WatchParty Socket.IO] Đã kết nối thành công: ${this.socket?.id}`);
      if (this.currentRoomId && this.currentUser) {
        this.joinRoom(this.currentRoomId, this.currentUser);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn(`[WatchParty Socket.IO] Ngắt kết nối: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[WatchParty Socket.IO] Lỗi kết nối Socket.IO:', err.message);
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }

  /**
   * Tham gia phòng xem chung
   */
  public joinRoom(roomId: string, user: SocketUserPayload): void {
    this.currentRoomId = roomId;
    this.currentUser = user;

    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.emit('join_room', { roomId, user });
    }
  }

  /**
   * Rời phòng xem chung
   */
  public leaveRoom(roomId?: string, user?: SocketUserPayload): void {
    const rId = roomId || this.currentRoomId;
    const u = user || this.currentUser;

    if (this.socket && rId) {
      this.socket.emit('leave_room', { roomId: rId, user: u });
    }

    this.currentRoomId = null;
    this.currentUser = null;
  }

  /**
   * ĐỒNG BỘ PLAY (Phát tiếp video)
   */
  public sendPlay(currentTime: number, user?: SocketUserPayload): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('play', {
      roomId: this.currentRoomId,
      currentTime,
      user: user || this.currentUser
    });
  }

  /**
   * ĐỒNG BỘ PAUSE (Tạm dừng video)
   */
  public sendPause(currentTime: number, user?: SocketUserPayload): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('pause', {
      roomId: this.currentRoomId,
      currentTime,
      user: user || this.currentUser
    });
  }

  /**
   * ĐỒNG BỘ SEEK (Tua video đến vị trí cụ thể)
   */
  public sendSeek(currentTime: number, user?: SocketUserPayload): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('seek', {
      roomId: this.currentRoomId,
      currentTime,
      user: user || this.currentUser
    });
  }

  /**
   * ĐỒNG BỘ HEARTBEAT (Chủ phòng gửi định kỳ để tránh lệch frame)
   */
  public sendSyncBeacon(currentTime: number, isPlaying: boolean): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('sync_beacon', {
      roomId: this.currentRoomId,
      currentTime,
      isPlaying
    });
  }

  /**
   * Gửi tin nhắn chat trong phòng
   */
  public sendMessage(message: any, user?: SocketUserPayload): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('chat_message', {
      roomId: this.currentRoomId,
      message,
      user: user || this.currentUser
    });
  }

  /**
   * Thả cảm xúc emoji bay trên màn hình
   */
  public triggerReaction(emoji: string, user?: SocketUserPayload): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('reaction', {
      roomId: this.currentRoomId,
      emoji,
      user: user || this.currentUser
    });
  }

  /**
   * Chuyển đổi trạng thái khóa quyền chủ phòng (Host Lock)
   */
  public toggleHostLock(hostLock: boolean): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('toggle_lock', {
      roomId: this.currentRoomId,
      hostLock
    });
  }

  /**
   * Chuyển đổi trạng thái micro (Voice Chat)
   */
  public toggleMic(userId: string, isMicMuted: boolean, userName?: string): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('toggle_mic', {
      roomId: this.currentRoomId,
      userId,
      isMicMuted,
      userName
    });
  }

  /**
   * Chủ phòng đổi phim / tập phim đang phát
   */
  public changeMovie(movieData: any, user?: SocketUserPayload): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('change_movie', {
      roomId: this.currentRoomId,
      movieData,
      user: user || this.currentUser
    });
  }

  /**
   * Chủ phòng đóng phòng xem chung
   */
  public closeRoom(message?: string): void {
    if (!this.socket || !this.currentRoomId) return;
    this.socket.emit('close_room', {
      roomId: this.currentRoomId,
      message
    });
  }

  /**
   * Hủy kết nối
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Instance Singleton toàn cục
export const watchPartySocket = new WatchPartySocketService();
