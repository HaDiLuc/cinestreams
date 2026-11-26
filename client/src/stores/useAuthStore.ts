import { create } from 'zustand';
import { UserProfile, NotificationItem, SubProfile } from '../types';
import { authService, AuthSuccessData } from '../services/authService';
import { apiClient } from '../services/apiClient';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  currentUser: UserProfile | null;
  subProfiles: SubProfile[];
  activeProfile: SubProfile;
  notifications: NotificationItem[];
  isNotificationOpen: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'otp' | 'forgot_password' | 'forgot_otp' | 'reset_password' | '2fa';
  pendingEmailForOtp: string;
  pendingResetToken: string;

  // Actions
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  login2Fa: (username: string, password: string) => Promise<{ success: boolean; message: string; require2fa?: boolean; email?: string }>;
  verifyLogin2Fa: (email: string, otpCode: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string; demoCode?: string }>;
  registerOtp: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  verifyRegisterOtp: (email: string, otpCode: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  forgotPasswordOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyForgotPasswordOtp: (email: string, otpCode: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;
  resetPassword: (email: string, resetToken: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  resendOtp: (email: string, type?: 'REGISTER' | 'LOGIN_2FA' | 'FORGOT_PWD') => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  openAuthModal: (mode?: 'login' | 'register' | 'otp' | 'forgot_password' | 'forgot_otp' | 'reset_password' | '2fa', email?: string) => void;
  closeAuthModal: () => void;
  toggleKidsMode: () => void;
  upgradeVip: (tier?: string) => void;
  markNotificationAsRead: (id: string) => void;
  toggleNotificationOpen: () => void;
  switchProfile: (profileId: string) => void;
  updateAvatar: (avatarUrl: string) => void;
}

const DEFAULT_SUB_PROFILES: SubProfile[] = [
  {
    id: 'prof-1',
    name: 'Minh Khang',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKI3gRB2-ajZZGcKyE5j9o_QEHEa3jFKNQP2LDRuci6XUPZo7WjzRr67sHpmExkSNaTWfkgRQ-Itw30N5OIN9GZoYP9E-htmJ2SQsH9tVP6aCpsRVOaVnI8ltteCYpTHRUWXojhbkoUTwS8XpkDIHRXmFj83yGCFvjkLDR6vWk8GMveFcp6CcrbT50VV2sHcmj2ghAuV1CiQX4kVprpH10y-oErnTIfsTRLHwLctzwqvDUQAe87wgqBg',
    role: 'Chủ Tài Khoản • VIP Diamond',
    isMaster: true,
    pinRequired: false,
    currentMovie: 'House of the Dragon',
    currentEpisode: 'S2:E4',
    progressPercent: 72,
    maturityRating: '18+'
  },
  {
    id: 'prof-2',
    name: 'Thu Trang',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXxkvw5VwDEJZTdAEsAaxVuOSiYBlX19OWyEQUkNPtBhrzUiDsrB_6MrJdSy8Xn2m_WthrTStGJqcwpyBWI0IacixPBzUem5akON2iNfXTcQfRv_8P_OmA3BCbuGPJLIGdCqMFdXSW7IOhlVXBpBQgaOkXSE9wdGmzpKD0mKLx0402jXwT7rpiyygK1Enh6I05Eh1Eb8i8DrwgKFurcHfUt9bJsph8mEbogoc62KO78faspa6xEhwBrw',
    role: 'Người Lớn • Phim 18+',
    pinRequired: true,
    pin: '1234',
    currentMovie: 'Ký Sinh Trùng',
    currentEpisode: 'Full 4K',
    progressPercent: 45,
    maturityRating: '18+'
  },
  {
    id: 'prof-3',
    name: 'Bé Bi & Bông',
    avatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150',
    role: 'Chế Độ Trẻ Em (Kids Mode)',
    isKids: true,
    pinRequired: false,
    currentMovie: 'Inside Out 2',
    currentEpisode: 'Lồng Tiếng',
    progressPercent: 90,
    maturityRating: 'K (< 7 tuổi)'
  }
];

// Auto-cleanup legacy mock tokens
if (typeof window !== 'undefined') {
  const existingToken = localStorage.getItem('cinestreams_token');
  if (existingToken === 'demo_token' || !existingToken) {
    localStorage.removeItem('cinestreams_token');
    localStorage.removeItem('cinestreams_refresh');
    localStorage.removeItem('cinestreams_user');
    localStorage.setItem('cinestreams_auth', 'false');
  }
}

export const DEFAULT_AVATAR = '/default-avatar.png';

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('cinestreams_token');
  if (!token || token === 'demo_token') return null;
  return token;
};

const getStoredUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cinestreams_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.avatar || parsed.avatar.includes('photo-1535713875002-d1d0cf377fde')) {
      parsed.avatar = DEFAULT_AVATAR;
    }
    return parsed;
  } catch {
    return null;
  }
};

const buildUserProfile = (data: AuthSuccessData, fallbackUsername: string): UserProfile => {
  const isVip = data.roles?.some((r: string) => r.toUpperCase().includes('VIP') || r.toUpperCase().includes('ADMIN')) ?? false;
  return {
    id: data.id || 'usr_' + Date.now(),
    name: data.username || fallbackUsername,
    email: data.email || (fallbackUsername.includes('@') ? fallbackUsername : `${fallbackUsername}@cinestreams.vn`),
    avatar: data.avatar || DEFAULT_AVATAR,
    isVip: isVip,
    vipTier: data.vipTier || (isVip ? 'VIP Cinema 4K' : 'Thường'),
    vipExpiresAt: isVip ? '24/11/2026' : undefined,
    isKidsMode: false,
    roles: data.roles && data.roles.length > 0 ? data.roles : ['ROLE_FREE_USER'],
    permissions: data.permissions || (isVip ? ['STREAM_4K', 'DOLBY_ATMOS', 'WATCH_PARTY_HOST'] : ['STREAM_720P'])
  };
};

const initialToken = getStoredToken();
const initialUser = getStoredUser();
const isAuth = Boolean(initialToken && localStorage.getItem('cinestreams_auth') === 'true' && initialUser);

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: isAuth,
  token: isAuth ? initialToken : null,
  refreshToken: isAuth ? localStorage.getItem('cinestreams_refresh') : null,
  currentUser: isAuth ? initialUser : null,
  subProfiles: DEFAULT_SUB_PROFILES,
  activeProfile: DEFAULT_SUB_PROFILES[0],
  isNotificationOpen: false,
  isAuthModalOpen: false,
  authModalMode: 'login',
  pendingEmailForOtp: '',
  pendingResetToken: '',
  notifications: [
    {
      id: 'notif-1',
      title: 'Tập Mới Đã Sẵn Sàng',
      message: 'Các tập phim mới đã chính thức phát sóng với chất lượng 4K Dolby Atmos.',
      time: '15 phút trước',
      read: false,
      type: 'update',
      link: '/'
    },
    {
      id: 'notif-2',
      title: 'Lời Mời Watch Party',
      message: 'Minh Hoàng đang mời bạn tham gia phòng xem chung CineStreams.',
      time: '1 giờ trước',
      read: false,
      type: 'watchparty',
      link: '/watch-party'
    },
    {
      id: 'notif-3',
      title: 'Ưu Đãi Gia Hạn VIP VietQR',
      message: 'Nhận ngay 3 tháng miễn phí khi gia hạn gói Gia Đình 1 năm trong tuần này.',
      time: '1 ngày trước',
      read: true,
      type: 'promo',
      link: '/vip-goi-cuoc'
    }
  ],

  login: async (username, password) => {
    try {
      const res = await authService.login({ username, password });

      if (res.success && res.data && res.data.accessToken) {
        const user = buildUserProfile(res.data, username);
        localStorage.setItem('cinestreams_token', res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem('cinestreams_refresh', res.data.refreshToken);
        }
        localStorage.setItem('cinestreams_auth', 'true');
        localStorage.setItem('cinestreams_user', JSON.stringify(user));

        set({
          isAuthenticated: true,
          token: res.data.accessToken,
          refreshToken: res.data.refreshToken || null,
          isAuthModalOpen: false,
          currentUser: user
        });
        return { success: true, message: res.message || 'Đăng nhập thành công!' };
      }
      return { success: false, message: res.message || 'Tài khoản hoặc mật khẩu không chính xác!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể kết nối đến máy chủ xác thực!' };
    }
  },

  login2Fa: async (username, password) => {
    try {
      const res = await authService.login2Fa({ username, password });
      if (res.success && res.data?.email) {
        set({ pendingEmailForOtp: res.data.email, authModalMode: '2fa' });
        return { success: true, message: res.message || 'Mã OTP 2FA đã được gửi tới email của bạn.', require2fa: true, email: res.data.email };
      }
      return { success: false, message: res.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi kết nối máy chủ xác thực 2FA!' };
    }
  },

  verifyLogin2Fa: async (email, otpCode) => {
    try {
      const res = await authService.verifyLogin2Fa(email, otpCode);
      if (res.success && res.data?.accessToken) {
        const user = buildUserProfile(res.data, email);
        localStorage.setItem('cinestreams_token', res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem('cinestreams_refresh', res.data.refreshToken);
        }
        localStorage.setItem('cinestreams_auth', 'true');
        localStorage.setItem('cinestreams_user', JSON.stringify(user));

        set({
          isAuthenticated: true,
          token: res.data.accessToken,
          refreshToken: res.data.refreshToken || null,
          isAuthModalOpen: false,
          currentUser: user
        });
        return { success: true, message: res.message || 'Đăng nhập 2FA thành công!' };
      }
      return { success: false, message: res.message || 'Mã xác thực 2FA không chính xác!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi xác minh 2FA!' };
    }
  },

  register: async (username, email, password) => {
    return get().registerOtp(username, email, password);
  },

  registerOtp: async (username, email, password) => {
    try {
      const res = await authService.registerOtp({ username, email, password, roles: ['ROLE_FREE_USER'] });
      if (res.success) {
        set({ pendingEmailForOtp: email, authModalMode: 'otp' });
        return {
          success: true,
          message: res.message || 'Đăng ký bước 1 thành công! Mã OTP 6 số đã được gửi qua email (hiệu lực 5 phút).',
        };
      }
      return {
        success: false,
        message: res.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin!'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể kết nối máy chủ để đăng ký tài khoản!'
      };
    }
  },

  verifyRegisterOtp: async (email, otpCode) => {
    try {
      const res = await authService.verifyRegisterOtp(email, otpCode);
      if (res.success && res.data?.accessToken) {
        const user = buildUserProfile(res.data, email);
        localStorage.setItem('cinestreams_token', res.data.accessToken);
        if (res.data.refreshToken) {
          localStorage.setItem('cinestreams_refresh', res.data.refreshToken);
        }
        localStorage.setItem('cinestreams_auth', 'true');
        localStorage.setItem('cinestreams_user', JSON.stringify(user));

        set({
          isAuthenticated: true,
          token: res.data.accessToken,
          refreshToken: res.data.refreshToken || null,
          isAuthModalOpen: false,
          currentUser: user
        });
        return { success: true, message: res.message || 'Kích hoạt tài khoản thành công! Bạn đã đăng nhập vào hệ thống.' };
      }
      return { success: false, message: res.message || 'Mã xác minh không hợp lệ hoặc đã hết hạn.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Không thể kết nối máy chủ để xác minh mã OTP!' };
    }
  },

  verifyOtp: async (email, code) => {
    return get().verifyRegisterOtp(email, code);
  },

  forgotPasswordOtp: async (email) => {
    try {
      const res = await authService.forgotPasswordOtp(email);
      if (res.success) {
        set({ pendingEmailForOtp: email.trim(), authModalMode: 'forgot_otp' });
        return { success: true, message: res.message || 'Mã OTP 6 số đã được gửi về email của bạn.' };
      }
      return { success: false, message: res.message || 'Không tìm thấy tài khoản với email này!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi gửi mã quên mật khẩu!' };
    }
  },

  verifyForgotPasswordOtp: async (email, otpCode) => {
    try {
      const res = await authService.verifyForgotPasswordOtp(email, otpCode);
      if (res.success && res.data?.resetToken) {
        set({ pendingResetToken: res.data.resetToken, authModalMode: 'reset_password' });
        return { success: true, message: 'Xác minh OTP thành công!', resetToken: res.data.resetToken };
      }
      return { success: false, message: res.message || 'Mã OTP không chính xác!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi xác minh mã đặt lại mật khẩu!' };
    }
  },

  resetPassword: async (email, resetToken, newPassword) => {
    try {
      const res = await authService.resetPassword({ email, resetToken, newPassword });
      if (res.success) {
        set({ authModalMode: 'login', pendingResetToken: '' });
        return { success: true, message: res.message || 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' };
      }
      return { success: false, message: res.message || 'Không thể đặt lại mật khẩu!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi đặt lại mật khẩu!' };
    }
  },

  resendOtp: async (email, type = 'REGISTER') => {
    try {
      const res = await authService.resendOtp(email, type);
      return {
        success: Boolean(res.success),
        message: res.message || 'Mã xác minh mới đã được gửi tới email của bạn (hiệu lực 5 phút)!'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Không thể gửi lại mã OTP. Vui lòng đợi 60 giây!'
      };
    }
  },

  logout: () => {
    authService.logout().catch(() => {});
    localStorage.removeItem('cinestreams_token');
    localStorage.removeItem('cinestreams_refresh');
    localStorage.removeItem('cinestreams_user');
    localStorage.setItem('cinestreams_auth', 'false');
    set({
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      currentUser: null
    });
  },

  openAuthModal: (mode = 'login', email = '') => {
    set({ isAuthModalOpen: true, authModalMode: mode, pendingEmailForOtp: email });
  },

  closeAuthModal: () => {
    set({ isAuthModalOpen: false });
  },

  switchProfile: (profileId) => {
    const { subProfiles, currentUser } = get();
    const target = subProfiles.find((p) => p.id === profileId);
    if (target && currentUser) {
      const updated = {
        ...currentUser,
        name: target.name,
        avatar: target.avatar,
        isKidsMode: Boolean(target.isKids)
      };
      localStorage.setItem('cinestreams_user', JSON.stringify(updated));
      set({
        activeProfile: target,
        currentUser: updated
      });
    }
  },

  toggleKidsMode: () => {
    const { currentUser } = get();
    if (currentUser) {
      const updated = { ...currentUser, isKidsMode: !currentUser.isKidsMode };
      localStorage.setItem('cinestreams_user', JSON.stringify(updated));
      set({ currentUser: updated });
    }
  },

  upgradeVip: (tier = 'Family Ultra 4K') => {
    const { currentUser } = get();
    if (currentUser) {
      const updated = {
        ...currentUser,
        isVip: true,
        vipTier: tier,
        vipExpiresAt: '24/11/2026',
        roles: Array.from(new Set([...(currentUser.roles || []).filter((r: string) => r !== 'ROLE_FREE_USER' && r !== 'ROLE_GUEST'), 'ROLE_VIP_USER']))
      };
      localStorage.setItem('cinestreams_user', JSON.stringify(updated));
      set({ currentUser: updated });
    }
  },

  markNotificationAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    }));
  },

  toggleNotificationOpen: () => set((state) => ({ isNotificationOpen: !state.isNotificationOpen })),

  updateAvatar: (avatarUrl: string) => {
    const { currentUser, subProfiles } = get();
    if (currentUser) {
      const updatedUser = { ...currentUser, avatar: avatarUrl };
      localStorage.setItem('cinestreams_user', JSON.stringify(updatedUser));

      // Also update master profile avatar if present
      const updatedSubProfiles = subProfiles.map((p) =>
        p.isMaster ? { ...p, avatar: avatarUrl } : p
      );

      set({
        currentUser: updatedUser,
        subProfiles: updatedSubProfiles
      });

      apiClient.put('/user/avatar', { avatar: avatarUrl }).catch(() => {});
    }
  }
}));
