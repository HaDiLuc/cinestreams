import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

export const NotificationDrawer: React.FC = () => {
  const { notifications, isNotificationOpen, toggleNotificationOpen, markNotificationAsRead } = useAuthStore();
  const navigate = useNavigate();

  if (!isNotificationOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={toggleNotificationOpen}>
      <div
        className="w-full max-w-sm h-full bg-surface-container-high/95 backdrop-blur-2xl border-l border-surface-variant/40 shadow-2xl p-4 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-surface-variant/40 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">notifications</span>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">Trung Tâm Thông Báo</h3>
            </div>
            <button
              onClick={toggleNotificationOpen}
              className="p-1 rounded-full text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[75vh]">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  markNotificationAsRead(item.id);
                  if (item.link) {
                    toggleNotificationOpen();
                    navigate(item.link);
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  item.read
                    ? 'bg-surface-container/40 border-surface-variant/20 opacity-70'
                    : 'bg-surface-container border-primary/30 shadow-md hover:border-primary'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                    {!item.read && <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>}
                    {item.title}
                  </p>
                  <span className="text-[10px] text-outline flex-shrink-0">{item.time}</span>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{item.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-surface-variant/30 text-center">
          <p className="text-[11px] text-outline">Đồng bộ tự động theo thời gian thực</p>
        </div>
      </div>
    </div>
  );
};
