import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useVipStore } from '../stores/useVipStore';

export const MobileNav: React.FC = () => {
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

  const items = [
    { label: 'Trang chủ', path: '/', icon: 'home' },
    { label: 'Bộ lọc', path: '/bo-loc', icon: 'explore' },
    { label: 'Party', path: '/watch-party', icon: 'groups', badge: isVipUser ? 'Live' : 'VIP' },
    { label: 'CineAI', path: '/tro-ly-phim-ai', icon: 'auto_awesome' },
    { label: 'VIP', path: '/vip-goi-cuoc', icon: 'workspace_premium' },
    { label: 'Hồ sơ', path: '/tai-khoan', icon: 'account_circle' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 xl:hidden bg-surface-container-lowest/95 backdrop-blur-2xl border-t border-surface-variant/40 shadow-[0_-4px_24px_rgba(0,0,0,0.8)] px-2 py-2 safe-area-bottom">
      <nav className="flex items-center justify-around">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <span
                    className={`material-symbols-outlined text-2xl transition-transform ${
                      isActive ? 'scale-110 icon-filled' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-tertiary-container text-on-tertiary-container text-[9px] font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5"></span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
