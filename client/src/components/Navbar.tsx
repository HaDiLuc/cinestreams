import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMovieStore } from '../stores/useMovieStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useVipStore } from '../stores/useVipStore';
import { Logo } from './Logo';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery } = useMovieStore();
  const { currentUser, notifications, toggleNotificationOpen, isAuthenticated, openAuthModal, logout } = useAuthStore();
  const { openPaymentModal } = useVipStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (userMenuTimeoutRef.current) {
        clearTimeout(userMenuTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut ⌘K or Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  const navLinks = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Phim Lẻ', path: '/phim-le' },
    { label: 'Phim Bộ', path: '/phim-bo' },
    { label: 'Hoạt Hình', path: '/hoat-hinh' },
    { label: 'Bảng Xếp Hạng', shortLabel: 'Xếp Hạng', path: '/bang-xep-hang' },
    { label: 'Trợ Lý Phim AI', shortLabel: 'CineAI', path: '/tro-ly-phim-ai', isAi: true },
    { label: 'VIP Gói Cước', shortLabel: 'Gói VIP', path: '/vip-goi-cuoc', isVip: true },
  ];

  const getRoleName = (r: any): string => {
    if (!r) return '';
    if (typeof r === 'string') return r;
    if (typeof r === 'object' && r.name) return String(r.name);
    return String(r);
  };

  const getPermName = (p: any): string => {
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p === 'object' && p.name) return String(p.name);
    return String(p);
  };

  // Kiểm tra quyền Quản trị / Phân quyền / Tài chính / Biên tập nội dung
  const userRoles = (currentUser?.roles || []).map((r) => getRoleName(r).toUpperCase());
  const userPerms = (currentUser?.permissions || []).map((p) => getPermName(p).toLowerCase());

  const isSuperAdmin =
    isAuthenticated &&
    Boolean(
      userRoles.some((r) => r.includes('ADMIN')) ||
        userRoles.includes('ROLE_ADMIN') ||
        userRoles.includes('ADMIN') ||
        currentUser?.username === 'admin' ||
        currentUser?.username === 'hadinhluc_pm' ||
        userPerms.some((p) => p.includes('role_manage') || p.includes('role:manage'))
    );

  const isFinanceManager =
    isAuthenticated &&
    Boolean(
      userRoles.some((r) => r.includes('FINANCE_MANAGER')) ||
      userPerms.some((p) => p.includes('finance:manage') || p.includes('refund:process'))
    );

  const isContentEditor =
    isAuthenticated &&
    Boolean(
      userRoles.some((r) => r.includes('CONTENT_EDITOR')) ||
      userPerms.some((p) => p.includes('content:edit') || p.includes('subtitle:manage'))
    );

  const isVipUser =
    isAuthenticated &&
    Boolean(
      currentUser?.isVip ||
      userRoles.some((r) => r.includes('VIP_USER') || r.includes('VIP'))
    );

  const isFreeUser =
    isAuthenticated &&
    !isSuperAdmin &&
    !isFinanceManager &&
    !isContentEditor &&
    !isVipUser &&
    Boolean(
      userRoles.some((r) => r.includes('FREE_USER') || r.includes('USER')) ||
      true
    );

  const isGuest =
    !isAuthenticated ||
    userRoles.some((r) => r.includes('GUEST'));

  const hasMoviePermission =
    isAuthenticated &&
    Boolean(
      isSuperAdmin ||
      isContentEditor ||
      userRoles.some((r) => ['ROLE_ADMIN', 'ROLE_CONTENT_EDITOR', 'ADMIN', 'CONTENT_EDITOR'].includes(r)) ||
      userPerms.some((p) =>
        ['movie_manage', 'upload_manage', 'content:edit', 'role_manage', 'role:manage', 'user:create', 'category:create'].includes(p)
      )
    );

  const hasFinancePermission = Boolean(isSuperAdmin || isFinanceManager);

  const hasAnyManagementAccess = Boolean(isSuperAdmin || hasMoviePermission || hasFinancePermission);

  const visibleNavLinks = navLinks;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-surface-container-lowest/90 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.7)]'
          : 'bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
      }`}
    >
      <div className="h-20 w-full px-3 sm:px-6 xl:px-8 max-w-[1920px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Navigation Links */}
        <div className="flex items-center gap-3 xl:gap-5 shrink-0 min-w-0">
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {visibleNavLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-2.5 py-1.5 transition-all rounded-lg text-xs 2xl:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'text-primary font-bold bg-surface-container/70 shadow-sm'
                      : link.isVip
                      ? 'text-secondary-fixed hover:text-on-surface hover:bg-surface-container'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {link.isAi && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
                  )}
                  {link.isVip && (
                    <span className="material-symbols-outlined text-secondary-fixed text-sm">
                      workspace_premium
                    </span>
                  )}
                  <span>{link.shortLabel || link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Icons & Search */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Omni Search Bar with ⌘K Trigger */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="relative hidden lg:flex items-center h-9 xl:h-10 px-3 bg-surface-container/70 hover:bg-surface-container rounded-full focus-within:ring-1 focus-within:ring-primary transition-all w-32 xl:w-44 2xl:w-60 cursor-pointer shrink"
          >
            <span className="material-symbols-outlined text-outline text-base mr-1.5 shrink-0">search</span>
            <span className="bg-transparent border-none outline-none w-full text-outline text-xs truncate select-none">
              {searchQuery ? searchQuery : 'Tìm phim...'}
            </span>
            <span className="hidden xl:inline px-1.5 py-0.5 rounded bg-surface-container-high text-outline text-[10px] font-bold ml-1 shrink-0">
              ⌘K
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Mobile Search Icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="lg:hidden p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              title="Tìm kiếm"
              type="button"
            >
              <span className="material-symbols-outlined text-xl">search</span>
            </button>

            {/* Watch Party Quick Trigger */}
            <button
              onClick={() => {
                navigate('/watch-party');
              }}
              className="hidden sm:flex p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all relative group"
              title="Phòng Xem Chung Watch Party"
              type="button"
            >
              <span className="material-symbols-outlined text-xl group-hover:text-tertiary transition-colors">
                groups
              </span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={toggleNotificationOpen}
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all relative"
              title="Thông báo"
              type="button"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-ping"></span>
              )}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary"></span>
              )}
            </button>

            {/* VIP Upgrade CTA Button (Chỉ hiển thị khi đã đăng nhập và trên màn hình rộng để không chiếm diện tích nút Đăng nhập / Đăng ký) */}
            {isAuthenticated && !currentUser?.isVip && (
              <button
                onClick={() => openPaymentModal()}
                className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-secondary-container to-primary-container text-on-secondary font-bold text-xs shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all shrink-0"
                type="button"
              >
                <span className="material-symbols-outlined text-sm">stars</span>
                <span>Nâng Cấp VIP</span>
              </button>
            )}

            {/* Auth Buttons or User Avatar */}
            {!isAuthenticated || !currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pl-1">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3 sm:px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs whitespace-nowrap border border-surface-variant/40 transition-colors shrink-0 shadow-sm"
                >
                  Đăng Nhập
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-secondary-container to-primary-container text-on-secondary font-bold text-xs whitespace-nowrap shadow-[0_0_16px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-95 transition-all shrink-0"
                >
                  Đăng Ký
                </button>
              </div>
            ) : (
              /* User Profile Avatar & Dropdown */
              <div
                className="pl-space-xs relative group"
                onMouseEnter={() => {
                  if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
                  setIsUserMenuOpen(true);
                }}
                onMouseLeave={() => {
                  userMenuTimeoutRef.current = setTimeout(() => {
                    setIsUserMenuOpen(false);
                  }, 250);
                }}
              >
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-0.5 rounded-full ring-2 ring-primary/40 hover:ring-primary transition-all focus:outline-none flex items-center gap-1.5 cursor-pointer relative"
                  type="button"
                  title={currentUser.name || 'Hồ sơ người dùng'}
                >
                  <img
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover bg-surface-container-highest"
                    src={currentUser.avatar || '/default-avatar.png'}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.png';
                    }}
                  />
                  {isSuperAdmin && (
                    <span
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-surface-container-lowest flex items-center justify-center text-[9px] text-black font-extrabold shadow-sm"
                      title="Quản trị viên (Admin)"
                    >
                      ★
                    </span>
                  )}
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container-high/95 backdrop-blur-2xl border border-surface-variant/40 shadow-2xl p-2 z-50 animate-fade-in"
                    onMouseEnter={() => {
                      if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
                      setIsUserMenuOpen(true);
                    }}
                    onMouseLeave={() => {
                      userMenuTimeoutRef.current = setTimeout(() => {
                        setIsUserMenuOpen(false);
                      }, 250);
                    }}
                  >
                    <div className="p-3 border-b border-surface-variant/30">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <p className="font-semibold text-on-surface text-sm truncate">{currentUser.name}</p>
                        {isSuperAdmin ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            👑 ADMIN
                          </span>
                        ) : isFinanceManager ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            💰 FINANCE_MANAGER
                          </span>
                        ) : isContentEditor ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30">
                            ✍️ CONTENT_EDITOR
                          </span>
                        ) : isVipUser ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            ⭐ VIP_USER
                          </span>
                        ) : isFreeUser ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                            👤 FREE_USER
                          </span>
                        ) : isGuest ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                            👁️ GUEST
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-outline truncate">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-label-caps text-secondary-fixed">
                        <span className="material-symbols-outlined text-xs">workspace_premium</span>
                        <span>Hội viên VIP ({currentUser.vipTier || 'Thường'})</span>
                      </div>
                    </div>

                    <div className="py-1">
                      {/* Khu Vực Quản Trị & Nghiệp Vụ Chuyên Trách */}
                      {hasAnyManagementAccess && (
                        <div className="mb-1.5 pb-1.5 border-b border-surface-variant/30 space-y-0.5">
                          <p className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">shield_person</span>
                            <span>Khu Vực Quản Trị & Nghiệp Vụ</span>
                          </p>

                          {/* 1. Phân quyền (Admin) */}
                          {isSuperAdmin && (
                            <Link
                              to="/quan-ly-phan-quyen"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-amber-400 font-bold hover:bg-amber-400/10 transition-colors group/admin"
                            >
                              <span className="material-symbols-outlined text-base text-amber-400 group-hover/admin:scale-110 transition-transform">
                                manage_accounts
                              </span>
                              <span>Phân Quyền & Quản Lý User</span>
                            </Link>
                          )}

                          {/* 2. Quản lý doanh thu (Finance Manager, Admin) */}
                          {hasFinancePermission && (
                            <Link
                              to="/quan-ly-doanh-thu"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-emerald-400 font-bold hover:bg-emerald-400/10 transition-colors group/fin"
                            >
                              <span className="material-symbols-outlined text-base text-emerald-400 group-hover/fin:scale-110 transition-transform">
                                payments
                              </span>
                              <span>Quản Lý Doanh Thu & Đối Soát</span>
                            </Link>
                          )}

                          {/* 3. CMS Quản trị & Biên tập nội dung (Content Editor, Moderator, Admin) */}
                          {hasMoviePermission && (
                            <Link
                              to="/quan-tri-phim"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-primary font-bold hover:bg-primary/10 transition-colors group/cms"
                            >
                              <span className="material-symbols-outlined text-base text-primary group-hover/cms:scale-110 transition-transform">
                                video_library
                              </span>
                              <span>CMS Quản Trị & Biên Tập Phim</span>
                            </Link>
                          )}
                        </div>
                      )}

                      <Link
                        to="/ho-so"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-base text-secondary">
                          switch_account
                        </span>
                        <span>Đổi hồ sơ gia đình</span>
                      </Link>
                      <Link
                        to="/tai-khoan"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">person</span>
                        <span>Hồ sơ & Danh sách lưu</span>
                      </Link>
                      <Link
                        to="/tai-khoan"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">photo_camera</span>
                        <span>Đổi ảnh đại diện</span>
                      </Link>
                      <Link
                        to="/bo-loc"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">tune</span>
                        <span>Bộ lọc phim nâng cao</span>
                      </Link>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          openPaymentModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary hover:bg-surface-container transition-colors text-left"
                      >
                        <span className="material-symbols-outlined text-base">qr_code_2</span>
                        <span>Gia hạn VIP VietQR</span>
                      </button>

                      <div className="border-t border-surface-variant/30 my-1"></div>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-error hover:bg-error-container/20 transition-colors text-left font-semibold"
                      >
                        <span className="material-symbols-outlined text-base">logout</span>
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
