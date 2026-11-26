import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../stores/useAuthStore';

interface SystemUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  verified?: boolean;
  active?: boolean;
  roles?: any[];
  permissions?: any[];
  createdAt?: string;
}

interface AuditLogItem {
  id: string;
  username: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

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

export const UserPermissionPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, openAuthModal } = useAuthStore();

  // Authentication & Permission check
  const userRoles = (currentUser?.roles || []).map((r) => getRoleName(r).toUpperCase());
  const userPerms = (currentUser?.permissions || []).map((p) => getPermName(p).toLowerCase());

  const isSuperAdmin = Boolean(
    isAuthenticated &&
    (userRoles.some((r) => r.includes('ADMIN')) ||
     userPerms.some((p) => p.includes('role_manage') || p.includes('role:manage')))
  );

  // Users state
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [updatingUsername, setUpdatingUsername] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal Custom Roles State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<SystemUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Modal Create New Dynamic Role
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');
  const [creatingRole, setCreatingRole] = useState<boolean>(false);

  // Tab & Audit Log State (Admin toàn quyền tra cứu Audit Log)
  const [activeTab, setActiveTab] = useState<'users' | 'audit_log'>('users');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);

  // Toggle Lock/Unlock User
  const handleToggleUserActive = async (targetUsername: string) => {
    setUpdatingUsername(targetUsername);
    try {
      const res = await apiClient.patch<any>(`/roles/users/${encodeURIComponent(targetUsername)}/toggle-active`);
      if (res && res.success) {
        setNotification({
          text: res.message || `Đã cập nhật trạng thái tài khoản ${targetUsername}!`,
          type: 'success',
        });
        await fetchUsers();
      } else {
        setNotification({
          text: res.message || 'Không thể đổi trạng thái tài khoản!',
          type: 'error',
        });
      }
    } catch (err: any) {
      setNotification({
        text: err?.message || 'Lỗi khi cập nhật trạng thái người dùng',
        type: 'error',
      });
    } finally {
      setUpdatingUsername(null);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const res = await apiClient.get<any>('/roles/audit-logs');
      if (res && res.success && Array.isArray(res.data)) {
        setAuditLogs(res.data);
      }
    } catch (err: any) {
      console.warn('Lỗi tải audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit_log') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiClient.get<any>('/roles/users');
      if (res && res.success && Array.isArray(res.data)) {
        setUsersList(res.data);
      } else if (Array.isArray(res)) {
        setUsersList(res);
      } else if (res && Array.isArray(res.data?.content)) {
        setUsersList(res.data.content);
      } else {
        setUsersList([]);
        const errMsg = res?.message || 'Không thể lấy dữ liệu danh sách người dùng từ máy chủ.';
        setFetchError(errMsg);
      }
    } catch (err: any) {
      setUsersList([]);
      const errMsg = err?.message || 'Lỗi kết nối tới máy chủ Backend (Cổng 8088). Vui lòng đảm bảo tiến trình Backend đang chạy.';
      setFetchError(errMsg);
      setNotification({
        text: errMsg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (targetUsername: string, newRoles: string[]) => {
    setUpdatingUsername(targetUsername);
    try {
      const res = await apiClient.post('/roles/assign-user', {
        username: targetUsername,
        roles: newRoles,
      });

      if (res.success) {
        setNotification({
          text: `Đã cập nhật vai trò cho người dùng "${targetUsername}" thành công!`,
          type: 'success',
        });
        await fetchUsers();
      } else {
        setNotification({
          text: res.message || 'Lỗi khi phân quyền cho người dùng',
          type: 'error',
        });
      }
    } catch (err: any) {
      setNotification({
        text: err?.message || 'Lỗi kết nối khi lưu quyền',
        type: 'error',
      });
    } finally {
      setUpdatingUsername(null);
    }
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setSelectedUserForEdit(user);
    const normalized = (user.roles || []).map((r) => {
      const name = getRoleName(r).toUpperCase();
      return name.startsWith('ROLE_') ? name : `ROLE_${name}`;
    });
    setSelectedRoles(normalized.length > 0 ? normalized : ['ROLE_FREE_USER']);
    setIsEditModalOpen(true);
  };

  const handleSaveUserRoles = async () => {
    if (!selectedUserForEdit) return;
    await handleAssignRole(selectedUserForEdit.username, selectedRoles);
    setIsEditModalOpen(false);
  };

  const toggleRoleSelection = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreateDynamicRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setNotification({ text: 'Vui lòng nhập tên vai trò!', type: 'error' });
      return;
    }

    setCreatingRole(true);
    try {
      const res = await apiClient.post('/roles', {
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
      });

      if (res.success) {
        setNotification({
          text: `Tạo vai trò mới "${newRoleName.toUpperCase()}" thành công!`,
          type: 'success',
        });
        setIsCreateRoleModalOpen(false);
        setNewRoleName('');
        setNewRoleDesc('');
      } else {
        setNotification({
          text: res.message || 'Lỗi khi tạo vai trò mới',
          type: 'error',
        });
      }
    } catch (err: any) {
      setNotification({
        text: err?.message || 'Lỗi kết nối khi tạo vai trò mới',
        type: 'error',
      });
    } finally {
      setCreatingRole(false);
    }
  };

  // 1. Kiểm tra đăng nhập
  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-low border border-surface-variant/40 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Yêu Cầu Đăng Nhập</h2>
            <p className="text-xs text-outline mt-2 leading-relaxed">
              Bạn cần đăng nhập tài khoản có thẩm quyền Quản trị viên (Admin) để sử dụng hệ thống Phân Quyền & Quản Lý User CineStreams.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>Đăng Nhập Ngay</span>
            </button>
            <Link
              to="/"
              className="w-full py-3 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-semibold block transition-colors text-center"
            >
              Quay Về Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Chờ tải thông tin tài khoản nếu chưa nạp xong
  if (isAuthenticated && !currentUser) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-outline">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
          <p className="text-xs font-semibold">Đang xác thực thông tin tài khoản...</p>
        </div>
      </div>
    );
  }

  // 3. Kiểm tra thẩm quyền Super Admin
  if (!isSuperAdmin) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-low border border-error/30 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-error/10 text-error mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Quyền Hạn Bị Từ Chối (403 Forbidden)</h2>
            <p className="text-xs text-outline mt-2 leading-relaxed">
              Tài khoản <span className="text-primary font-bold">{currentUser?.name || currentUser?.email}</span> không có quyền Quản trị viên (ROLE_ADMIN).
              Chỉ Quản trị viên tối cao mới có thẩm quyền truy cập trang phân quyền và cấp vai trò cho thành viên khác.
            </p>
          </div>
          <div>
            <Link
              to="/"
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:bg-primary/90 block transition-all text-center"
            >
              Quay Về Trang Chủ CineStreams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const safeUsers = Array.isArray(usersList) ? usersList : [];

  // Filtered users
  const filteredUsers = safeUsers.filter((u) => {
    if (!u) return false;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      (u.username && String(u.username).toLowerCase().includes(q)) ||
      (u.email && String(u.email).toLowerCase().includes(q)) ||
      (u.fullName && String(u.fullName).toLowerCase().includes(q));

    if (!matchSearch) return false;

    const rolesUpper = (u.roles || []).map((r) => getRoleName(r).toUpperCase());
    const isUserAdmin = rolesUpper.some((r) => r.includes('ADMIN'));
    const isUserFinance = rolesUpper.some((r) => r.includes('FINANCE_MANAGER'));
    const isUserEditor = rolesUpper.some((r) => r.includes('CONTENT_EDITOR'));
    const isUserVip = rolesUpper.some((r) => r.includes('VIP_USER') || r === 'ROLE_VIP' || r === 'VIP');
    const isUserFree = rolesUpper.some((r) => r.includes('FREE_USER') || r === 'ROLE_USER');
    const isUserGuest = rolesUpper.some((r) => r.includes('GUEST'));

    if (roleFilter === 'ADMIN' && !isUserAdmin) return false;
    if (roleFilter === 'FINANCE_MANAGER' && !isUserFinance) return false;
    if (roleFilter === 'CONTENT_EDITOR' && !isUserEditor) return false;
    if (roleFilter === 'VIP_USER' && !isUserVip) return false;
    if (roleFilter === 'FREE_USER' && !isUserFree) return false;
    if (roleFilter === 'GUEST' && !isUserGuest) return false;

    if (statusFilter === 'VERIFIED' && !u.verified) return false;
    if (statusFilter === 'UNVERIFIED' && u.verified) return false;

    return true;
  });

  const totalUsers = safeUsers.length;
  const adminCount = safeUsers.filter((u) => (u?.roles || []).some((r) => getRoleName(r).toUpperCase().includes('ADMIN'))).length;
  const financeCount = safeUsers.filter((u) => (u?.roles || []).some((r) => getRoleName(r).toUpperCase().includes('FINANCE_MANAGER'))).length;
  const editorCount = safeUsers.filter((u) => (u?.roles || []).some((r) => getRoleName(r).toUpperCase().includes('CONTENT_EDITOR'))).length;
  const vipCount = safeUsers.filter((u) => (u?.roles || []).some((r) => {
    const ro = getRoleName(r).toUpperCase();
    return ro.includes('VIP_USER') || ro === 'ROLE_VIP' || ro === 'VIP';
  })).length;
  const freeCount = safeUsers.filter((u) => (u?.roles || []).some((r) => {
    const ro = getRoleName(r).toUpperCase();
    return ro.includes('FREE_USER') || ro === 'ROLE_USER';
  })).length;
  const guestCount = safeUsers.filter((u) => (u?.roles || []).some((r) => getRoleName(r).toUpperCase().includes('GUEST'))).length;
  const verifiedCount = safeUsers.filter((u) => u?.verified).length;

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] bg-surface-container-lowest text-on-surface p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-variant/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-amber-400 text-2xl">manage_accounts</span>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">CineStreams Security & RBAC</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
              👑 Super Admin Access
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Hệ Thống Phân Quyền & Quản Lý User</h1>
          <p className="text-xs text-outline mt-1">
            Quản lý tài khoản, kích hoạt hoặc khóa tài khoản, phân quyền 6 vai trò chuẩn, kiểm soát Quality Publish Gate & Audit Log
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === 'users'
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'bg-surface-container hover:bg-surface-variant text-outline hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">group</span>
              <span>Danh Sách Người Dùng</span>
            </button>
            <button
              onClick={() => setActiveTab('audit_log')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === 'audit_log'
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'bg-surface-container hover:bg-surface-variant text-outline hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">history_edu</span>
              <span>Nhật Ký Kiểm Toán (Audit Log)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setIsCreateRoleModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-variant text-zinc-200 border border-surface-variant/40 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base text-amber-400">add_moderator</span>
            <span>Tạo Vai Trò Mới</span>
          </button>

          <Link
            to="/quan-ly-doanh-thu"
            className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">payments</span>
            <span>Quản Lý Doanh Thu</span>
          </Link>

          <Link
            to="/quan-tri-phim"
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined text-base">video_library</span>
            <span>CMS Quản Trị Phim</span>
          </Link>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border shadow-lg ${
            notification.type === 'success'
              ? 'bg-primary/15 border-primary text-primary'
              : 'bg-error/20 border-error text-error'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              {notification.type === 'success' ? 'verified' : 'error'}
            </span>
            <span className="font-semibold">{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80">
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        </div>
      )}

      {/* Warning Backend Connection if Error */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-xl text-amber-400 mt-0.5">warning</span>
            <div>
              <p className="font-bold text-amber-200">Không thể kết nối danh sách người dùng từ Backend:</p>
              <p className="text-[11px] text-zinc-300 mt-0.5">{fetchError}</p>
              <p className="text-[11px] text-outline mt-1">Đảm bảo Backend Spring Boot đã được khởi chạy trên cổng 8088 của VPS.</p>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* KPI Stats (6 Roles Chuẩn) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
          </div>
          <div>
            <p className="text-[10px] text-outline font-medium">👑 ADMIN</p>
            <p className="text-lg font-bold font-mono text-red-400">{adminCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">payments</span>
          </div>
          <div>
            <p className="text-[10px] text-outline font-medium">💰 FINANCE_MANAGER</p>
            <p className="text-lg font-bold font-mono text-emerald-400">{financeCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">edit_note</span>
          </div>
          <div>
            <p className="text-[10px] text-outline font-medium">✍️ CONTENT_EDITOR</p>
            <p className="text-lg font-bold font-mono text-fuchsia-400">{editorCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">workspace_premium</span>
          </div>
          <div>
            <p className="text-[10px] text-outline font-medium">⭐ VIP_USER</p>
            <p className="text-lg font-bold font-mono text-amber-400">{vipCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">person</span>
          </div>
          <div>
            <p className="text-[10px] text-outline font-medium">👤 FREE_USER</p>
            <p className="text-lg font-bold font-mono text-sky-400">{freeCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-500/10 text-zinc-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">visibility</span>
          </div>
          <div>
            <p className="text-[10px] text-outline font-medium">👁️ GUEST</p>
            <p className="text-lg font-bold font-mono text-zinc-400">{guestCount}</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      {activeTab === 'users' && (
      <div className="flex flex-col md:flex-row items-center gap-3 bg-surface-container-low p-3.5 rounded-2xl border border-surface-variant/30">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo username, email, hoặc tên đầy đủ..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 cursor-pointer"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">👑 ADMIN (Quản trị toàn quyền)</option>
            <option value="FINANCE_MANAGER">💰 FINANCE_MANAGER (Quản lý doanh thu)</option>
            <option value="CONTENT_EDITOR">✍️ CONTENT_EDITOR (Biên tập nội dung)</option>
            <option value="VIP_USER">⭐ VIP_USER (Thành viên trả phí)</option>
            <option value="FREE_USER">👤 FREE_USER (Thành viên miễn phí)</option>
            <option value="GUEST">👁️ GUEST (Khách vãng lai)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái OTP</option>
            <option value="VERIFIED">Đã kích hoạt OTP</option>
            <option value="UNVERIFIED">Chưa kích hoạt OTP</option>
          </select>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-variant text-xs text-on-surface flex items-center gap-1.5 transition-colors border border-surface-variant/40 shrink-0 font-semibold"
            title="Làm mới danh sách"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin text-primary' : ''}`}>
              refresh
            </span>
            <span>Làm Mới</span>
          </button>
        </div>
      </div>
      )}

      {/* Users Table */}
      {activeTab === 'users' && (
      <div className="rounded-2xl bg-surface-container-low border border-surface-variant/30 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-on-surface">
            <thead className="bg-surface-container uppercase text-[10px] tracking-wider text-outline border-b border-surface-variant/30">
              <tr>
                <th className="py-3.5 px-4">Tài Khoản / Người Dùng</th>
                <th className="py-3.5 px-3">Xác Thực OTP</th>
                <th className="py-3.5 px-3">Vai Trò & Quyền Hạn</th>
                <th className="py-3.5 px-4 text-right">Phân Quyền & Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/20">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-outline">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary inline-block">
                      sync
                    </span>
                    <p className="mt-2 text-xs font-medium">Đang tải danh sách tài khoản hệ thống...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-outline">
                    <span className="material-symbols-outlined text-3xl opacity-40 mb-1 inline-block">person_search</span>
                    <p className="text-xs">Không tìm thấy tài khoản người dùng nào phù hợp bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const rolesUpper = (u.roles || []).map((r) => getRoleName(r).toUpperCase());
                  const isUserAdmin = rolesUpper.some((r) => r.includes('ADMIN'));
                  const isUserFinance = rolesUpper.some((r) => r.includes('FINANCE_MANAGER'));
                  const isUserEditor = rolesUpper.some((r) => r.includes('CONTENT_EDITOR'));
                  const isUserVip = rolesUpper.some((r) => r.includes('VIP_USER') || r === 'ROLE_VIP' || r === 'VIP');
                  const isUserFree = rolesUpper.some((r) => r.includes('FREE_USER') || r === 'ROLE_USER');
                  const isUserGuest = rolesUpper.some((r) => r.includes('GUEST'));
                  const isSelf = currentUser?.email === u.email || currentUser?.name === u.username;
                  const displayName = u.fullName || u.username || 'Thành viên';
                  const initialChar = u.username ? String(u.username).charAt(0).toUpperCase() : 'U';

                  return (
                    <tr key={u.id || u.username} className="hover:bg-surface-container/50 transition-colors">
                      {/* Cột 1: Thông tin User */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-sm text-primary uppercase border border-surface-variant/40 shrink-0">
                            {initialChar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-on-surface text-sm">{displayName}</p>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">
                                  Bạn
                                </span>
                              )}
                              {isUserVip && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                                  VIP 4K
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-outline font-mono">@{u.username} • {u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Trạng thái OTP & Khóa/Mở */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1.5">
                          {u.verified ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-xs">verified</span>
                              <span>Đã kích hoạt OTP</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-xs">pending</span>
                              <span>Chưa kích hoạt</span>
                            </span>
                          )}

                          {u.active === false ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-xs">lock</span>
                              <span>ĐÃ KHÓA TÀI KHOẢN</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-300 flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              <span>Đang hoạt động</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 3: Vai trò & Quyền (6 Roles Chuẩn) */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1.5">
                            {isUserAdmin && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 shadow-sm">
                                <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                                <span>👑 ADMIN</span>
                              </span>
                            )}
                            {isUserFinance && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                                <span className="material-symbols-outlined text-xs">payments</span>
                                <span>💰 FINANCE_MANAGER</span>
                              </span>
                            )}
                            {isUserEditor && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30 flex items-center gap-1 shadow-sm">
                                <span className="material-symbols-outlined text-xs">edit_note</span>
                                <span>✍️ CONTENT_EDITOR</span>
                              </span>
                            )}
                            {isUserVip && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                                <span className="material-symbols-outlined text-xs">workspace_premium</span>
                                <span>⭐ VIP_USER</span>
                              </span>
                            )}
                            {isUserFree && !isUserAdmin && !isUserFinance && !isUserEditor && !isUserVip && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">person</span>
                                <span>👤 FREE_USER</span>
                              </span>
                            )}
                            {isUserGuest && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-surface-container-highest text-zinc-400 border border-surface-variant/40 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">visibility</span>
                                <span>👁️ GUEST</span>
                              </span>
                            )}
                          </div>

                          {/* Chips quyền hạn */}
                          {u.permissions && u.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-xs mt-1">
                              {u.permissions.slice(0, 3).map((p, pIdx) => (
                                <span key={getPermName(p) + '_' + pIdx} className="px-1.5 py-0.2 rounded text-[9px] bg-surface-container text-outline font-mono">
                                  {getPermName(p)}
                                </span>
                              ))}
                              {u.permissions.length > 3 && (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-surface-container text-outline font-mono">
                                  +{u.permissions.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột 4: Nút phân quyền & Thao tác (6 Role Actions) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {updatingUsername === u.username ? (
                            <span className="text-xs text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                              <span>Đang cập nhật...</span>
                            </span>
                          ) : isSelf ? (
                            <span className="text-[11px] text-outline font-medium italic">Tài khoản hiện tại</span>
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                {/* Gán Finance Manager */}
                                {!isUserFinance && (
                                  <button
                                    onClick={() => handleAssignRole(u.username, ['ROLE_FINANCE_MANAGER', 'ROLE_FREE_USER'])}
                                    className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-emerald-500/30"
                                    title="Quản lý doanh thu: Lịch sử giao dịch mua gói, báo cáo doanh số, xử lý hoàn tiền, đối soát"
                                  >
                                    <span className="material-symbols-outlined text-xs">payments</span>
                                    <span>+ Finance</span>
                                  </button>
                                )}

                                {/* Gán Content Editor */}
                                {!isUserEditor && (
                                  <button
                                    onClick={() => handleAssignRole(u.username, ['ROLE_CONTENT_EDITOR', 'ROLE_FREE_USER'])}
                                    className="px-2 py-1 rounded-lg bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-fuchsia-500/30"
                                    title="Biên tập nội dung: Nhập metadata phim, tải poster, banner, WebVTT, tạo season & quản lý tập"
                                  >
                                    <span className="material-symbols-outlined text-xs">edit_note</span>
                                    <span>+ Editor</span>
                                  </button>
                                )}

                                {/* Gán VIP User */}
                                {!isUserVip && (
                                  <button
                                    onClick={() => handleAssignRole(u.username, ['ROLE_VIP_USER', 'ROLE_FREE_USER'])}
                                    className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-amber-500/30"
                                    title="Thành viên trả phí: Phim độc quyền VIP/Originals, chuẩn 1080p/4K, không quảng cáo, mở phòng xem chung"
                                  >
                                    <span className="material-symbols-outlined text-xs">workspace_premium</span>
                                    <span>+ VIP</span>
                                  </button>
                                )}

                                {/* Gán Admin */}
                                {!isUserAdmin && (
                                  <button
                                    onClick={() => handleAssignRole(u.username, ['ROLE_ADMIN', 'ROLE_FINANCE_MANAGER', 'ROLE_CONTENT_EDITOR', 'ROLE_VIP_USER', 'ROLE_FREE_USER'])}
                                    className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-red-500/30"
                                    title="Quản trị toàn quyền: Quản lý người dùng, phân quyền vai trò, cấu hình hệ thống, audit log"
                                  >
                                    <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                                    <span>+ Admin</span>
                                  </button>
                                )}

                                {/* Thu hồi quyền về FREE_USER */}
                                {(isUserAdmin || isUserFinance || isUserEditor || isUserVip) && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Bạn có chắc chắn muốn chuyển tài khoản "${u.username}" về FREE_USER (Thành viên miễn phí)?`)) {
                                        handleAssignRole(u.username, ['ROLE_FREE_USER']);
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg bg-error/15 hover:bg-error/25 text-error font-medium text-[10px] flex items-center gap-1 transition-all border border-error/30"
                                    title="Chuyển về thành viên miễn phí"
                                  >
                                    <span className="material-symbols-outlined text-xs">person_remove</span>
                                    <span>Về Free</span>
                                  </button>
                                )}

                                {/* Khóa / Kích hoạt tài khoản */}
                                {u.username !== 'admin' && (
                                  <button
                                    onClick={() => handleToggleUserActive(u.username)}
                                    className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all border ${
                                      u.active === false
                                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                                        : 'bg-zinc-700/40 hover:bg-zinc-700/70 text-zinc-300 border-zinc-600/40'
                                    }`}
                                    title={u.active === false ? "Kích hoạt lại tài khoản" : "Khóa tài khoản này"}
                                  >
                                    <span className="material-symbols-outlined text-xs">
                                      {u.active === false ? 'lock_open' : 'lock'}
                                    </span>
                                    <span>{u.active === false ? 'Mở Khóa' : 'Khóa'}</span>
                                  </button>
                                )}

                                {/* Nút Tùy chỉnh chi tiết */}
                                <button
                                  onClick={() => handleOpenEditModal(u)}
                                  className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-variant text-zinc-300 transition-colors border border-surface-variant/40 text-[10px] font-semibold flex items-center gap-1"
                                  title="Tùy chỉnh đa vai trò chi tiết"
                                >
                                  <span className="material-symbols-outlined text-xs">tune</span>
                                  <span>Phân Quyền</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Tab 2: Audit Logs (Admin Audit Log Inspection) */}
      {activeTab === 'audit_log' && (
        <div className="rounded-2xl bg-surface-container-low border border-surface-variant/30 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-surface-variant/30 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-lg">history_edu</span>
                <span>Nhật Ký Kiểm Toán Toàn Hệ Thống (Audit Logs)</span>
              </h3>
              <p className="text-[11px] text-outline mt-0.5">
                Ghi nhận các tác vụ: Kích hoạt/khóa tài khoản, gán/thu hồi quyền, phê duyệt xuất bản phim Quality Publish Gate
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              disabled={loadingAuditLogs}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-variant text-xs text-on-surface font-semibold flex items-center gap-1.5 transition-colors border border-surface-variant/40"
            >
              <span className={`material-symbols-outlined text-sm ${loadingAuditLogs ? 'animate-spin text-primary' : ''}`}>
                refresh
              </span>
              <span>Làm Mới Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-on-surface">
              <thead className="bg-surface-container uppercase text-[10px] tracking-wider text-outline border-b border-surface-variant/30">
                <tr>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-3">Người Thực Hiện</th>
                  <th className="py-3 px-3">Hành Động</th>
                  <th className="py-3 px-3">Đối Tượng</th>
                  <th className="py-3 px-4">Chi Tiết Tác Vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant/20">
                {loadingAuditLogs ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-outline">
                      <span className="material-symbols-outlined animate-spin text-2xl text-primary inline-block">sync</span>
                      <p className="mt-1 text-xs">Đang tải nhật ký kiểm toán...</p>
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-outline">
                      <span className="material-symbols-outlined text-3xl opacity-40 mb-1 inline-block">verified_user</span>
                      <p className="text-xs">Chưa có bản ghi nhật ký kiểm toán mới.</p>
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-outline whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : 'Vừa xong'}
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-400">
                        @{log.username}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high border border-surface-variant/40 font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-on-surface">
                        {log.target}
                      </td>
                      <td className="py-3 px-4 text-outline text-[11px]">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL TÙY CHỈNH PHÂN QUYỀN (CHÍNH XÁC 6 ROLES) ================= */}
      {isEditModalOpen && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-surface-container-low rounded-3xl border border-surface-variant/40 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface">Cấu Hình Phân Quyền Vai Trò (RBAC)</h3>
                <p className="text-xs text-outline font-mono">@{selectedUserForEdit.username} ({selectedUserForEdit.email})</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-outline hover:text-white">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-zinc-300">Chọn các vai trò áp dụng cho tài khoản (Hệ thống gồm 6 vai trò chuẩn):</p>

              {/* 1. ROLE_GUEST */}
              <div
                onClick={() => toggleRoleSelection('ROLE_GUEST')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedRoles.includes('ROLE_GUEST')
                    ? 'bg-zinc-500/20 border-zinc-400 text-on-surface'
                    : 'bg-surface-container border-surface-variant/40 text-outline hover:border-surface-variant'
                }`}
              >
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-xl text-zinc-400">visibility</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-zinc-200">GUEST (Khách vãng lai)</p>
                    <span className="text-[10px] font-mono text-zinc-400">{selectedRoles.includes('ROLE_GUEST') ? '✓ Đang bật' : ''}</span>
                  </div>
                  <p className="text-[11px] text-outline mt-0.5">Duyệt danh mục phim trang chủ, tìm kiếm phim, xem trailer và xem thử đúng 3 phút (180 giây) đầu tiên của các bộ phim.</p>
                </div>
              </div>

              {/* 2. ROLE_FREE_USER */}
              <div
                onClick={() => toggleRoleSelection('ROLE_FREE_USER')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedRoles.includes('ROLE_FREE_USER') || selectedRoles.includes('ROLE_USER')
                    ? 'bg-sky-500/15 border-sky-500 text-sky-200'
                    : 'bg-surface-container border-surface-variant/40 text-outline hover:border-surface-variant'
                }`}
              >
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-xl text-sky-400">person</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-sky-300">FREE_USER (Thành viên miễn phí)</p>
                    <span className="text-[10px] font-mono text-sky-400">
                      {selectedRoles.includes('ROLE_FREE_USER') || selectedRoles.includes('ROLE_USER') ? '✓ Đang bật' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">Đã đăng ký tài khoản & xác thực Email OTP 6 số. Được xem trọn vẹn phim gắn nhãn Free chất lượng tối đa 720p, quản lý Watchlist, lưu lịch sử xem và bình luận/đánh giá phim.</p>
                </div>
              </div>

              {/* 3. ROLE_VIP_USER */}
              <div
                onClick={() => toggleRoleSelection('ROLE_VIP_USER')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedRoles.includes('ROLE_VIP_USER') || selectedRoles.includes('ROLE_VIP')
                    ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                    : 'bg-surface-container border-surface-variant/40 text-outline hover:border-surface-variant'
                }`}
              >
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-xl text-amber-400">workspace_premium</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-amber-300">VIP_USER (Hội viên VIP cao cấp)</p>
                    <span className="text-[10px] font-mono text-amber-400">
                      {selectedRoles.includes('ROLE_VIP_USER') || selectedRoles.includes('ROLE_VIP') ? '✓ Đang bật' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">Đã thanh toán gói VIP. Hưởng toàn bộ quyền người dùng cơ bản, cộng thêm: Xem không giới hạn kho phim VIP/Originals độc quyền, mở khóa 1080p Full HD và 4K Dolby Atmos, quyền khởi tạo hoặc tham gia Watch Party thời gian thực.</p>
                </div>
              </div>

              {/* 4. ROLE_CONTENT_EDITOR */}
              <div
                onClick={() => toggleRoleSelection('ROLE_CONTENT_EDITOR')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedRoles.includes('ROLE_CONTENT_EDITOR')
                    ? 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-200'
                    : 'bg-surface-container border-surface-variant/40 text-outline hover:border-surface-variant'
                }`}
              >
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-xl text-fuchsia-400">edit_note</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-fuchsia-300">CONTENT_EDITOR (Biên tập viên nội dung)</p>
                    <span className="text-[10px] font-mono text-fuchsia-400">{selectedRoles.includes('ROLE_CONTENT_EDITOR') ? '✓ Đang bật' : ''}</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">Truy cập Cổng quản trị CMS, khởi tạo và cập nhật Metadata phim, mùa, tập, tải poster/backdrop/phụ đề WebVTT, tải video phân đoạn 5GB+ và kiểm duyệt bình luận cộng đồng.</p>
                </div>
              </div>

              {/* 5. ROLE_FINANCE_MANAGER */}
              <div
                onClick={() => toggleRoleSelection('ROLE_FINANCE_MANAGER')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedRoles.includes('ROLE_FINANCE_MANAGER')
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200'
                    : 'bg-surface-container border-surface-variant/40 text-outline hover:border-surface-variant'
                }`}
              >
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-xl text-emerald-400">payments</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-emerald-300">FINANCE_MANAGER (Quản lý tài chính & vận hành)</p>
                    <span className="text-[10px] font-mono text-emerald-400">{selectedRoles.includes('ROLE_FINANCE_MANAGER') ? '✓ Đang bật' : ''}</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">Cấu hình biểu giá các gói cước VIP, theo dõi danh sách đơn hàng thanh toán VietQR, đối soát sao kê tài chính, phê duyệt hoàn tiền và xem báo cáo doanh thu trên Dashboard.</p>
                </div>
              </div>

              {/* 6. ROLE_ADMIN */}
              <div
                onClick={() => toggleRoleSelection('ROLE_ADMIN')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedRoles.includes('ROLE_ADMIN')
                    ? 'bg-red-500/15 border-red-500 text-red-200'
                    : 'bg-surface-container border-surface-variant/40 text-outline hover:border-surface-variant'
                }`}
              >
                <div className="mt-0.5">
                  <span className="material-symbols-outlined text-xl text-red-400">admin_panel_settings</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-red-300">ADMIN (Quản trị viên hệ thống tối cao)</p>
                    <span className="text-[10px] font-mono text-red-400">{selectedRoles.includes('ROLE_ADMIN') ? '✓ Đang bật' : ''}</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">Toàn quyền hệ thống: Quản lý người dùng, kích hoạt/khóa tài khoản, phân quyền động (tạo Permission, tạo Role và gán cho User), phê duyệt xuất bản phim ra trang chủ (Quality Publish Gate) và tra cứu toàn bộ Nhật ký kiểm toán (Audit Log).</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-variant/30 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-xs text-zinc-300 font-semibold"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveUserRoles}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-lg hover:bg-primary/90 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                <span>Lưu Phân Quyền</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL TẠO VAI TRÒ MỚI ================= */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-surface-container-low rounded-3xl border border-surface-variant/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3">
              <h3 className="font-bold text-base text-on-surface">Tạo Vai Trò Mới</h3>
              <button onClick={() => setIsCreateRoleModalOpen(false)} className="p-1 text-outline hover:text-white">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDynamicRole} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Tên Vai Trò (Ví dụ: ROLE_EDITOR, ROLE_MANAGER)</label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="ROLE_EDITOR"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary uppercase font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Mô Tả Chức Năng</label>
                <textarea
                  rows={3}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Mô tả thẩm quyền của vai trò này trong hệ thống..."
                  className="w-full p-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-xs text-zinc-300 font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={creatingRole}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-lg hover:bg-primary/90 transition-all flex items-center gap-1.5"
                >
                  {creatingRole ? (
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">add_moderator</span>
                  )}
                  <span>Xác Nhận Tạo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
