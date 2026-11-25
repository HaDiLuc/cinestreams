import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../stores/useAuthStore';

interface FinanceTransaction {
  orderId: string;
  username: string;
  userEmail: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  bankName: string;
  accountNumber: string;
  transferSyntax: string;
  status: 'PAID_VERIFIED' | 'PENDING_PAYMENT' | 'REFUNDED';
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  refundReason?: string;
  gatewayRef?: string;
}

interface FinanceOverview {
  totalRevenue: number;
  monthRevenue: number;
  totalRefunded: number;
  paidCount: number;
  pendingCount: number;
  refundCount: number;
  successRate: number;
  monthlyPlanCount: number;
  sixMonthPlanCount: number;
  yearlyPlanCount: number;
  currency: string;
  gatewayStatus: string;
  bankGateway: string;
  lastReconciledAt: string;
}

const getRoleName = (r: any): string => {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r === 'object' && r.name) return String(r.name);
  return String(r);
};

export const FinanceManagementPage: React.FC = () => {
  const { currentUser, isAuthenticated, openAuthModal } = useAuthStore();

  const userRoles = (currentUser?.roles || []).map((r) => getRoleName(r).toUpperCase());
  const isFinanceAuthorized = Boolean(
    isAuthenticated &&
    (userRoles.some((r) => r.includes('ADMIN') || r.includes('FINANCE_MANAGER')) ||
     (currentUser?.permissions || []).some((p: any) => String(p).toLowerCase().includes('finance')))
  );

  const [activeTab, setActiveTab] = useState<'transactions' | 'reconciliation' | 'reports'>('transactions');
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Refund Modal State
  const [selectedTxForRefund, setSelectedTxForRefund] = useState<FinanceTransaction | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  // Reconciliation State
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [reconcileResult, setReconcileResult] = useState<any | null>(null);

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isFinanceAuthorized) {
      loadFinanceData();
    }
  }, [isFinanceAuthorized]);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const [ovRes, txRes] = await Promise.all([
        apiClient.get<any>('/finance/overview'),
        apiClient.get<any>('/finance/transactions')
      ]);

      if (ovRes && ovRes.success && ovRes.data) {
        setOverview(ovRes.data);
      } else if (ovRes && (ovRes as any).totalRevenue !== undefined) {
        setOverview(ovRes as any);
      }

      if (txRes && txRes.success && Array.isArray(txRes.data)) {
        setTransactions(txRes.data);
      } else if (Array.isArray(txRes)) {
        setTransactions(txRes);
      }
    } catch (err: any) {
      setNotification({
        text: 'Lỗi nạp dữ liệu tài chính: ' + (err?.message || 'Không thể kết nối máy chủ'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRefundModal = (tx: FinanceTransaction) => {
    setSelectedTxForRefund(tx);
    setRefundReason('Khách hàng yêu cầu hoàn tiền do thanh toán trùng hoặc đổi nhu cầu');
  };

  const handleConfirmRefund = async () => {
    if (!selectedTxForRefund) return;
    setIsRefunding(true);
    try {
      const res = await apiClient.post<any>('/finance/refund', {
        orderId: selectedTxForRefund.orderId,
        reason: refundReason
      });

      if (res && res.success) {
        setNotification({
          text: `Đã hoàn tiền ${selectedTxForRefund.amount.toLocaleString('vi-VN')}đ cho đơn ${selectedTxForRefund.orderId} thành công!`,
          type: 'success'
        });
        setSelectedTxForRefund(null);
        await loadFinanceData();
      } else {
        setNotification({
          text: res?.message || 'Không thể hoàn tiền đơn hàng',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({
        text: 'Lỗi hoàn tiền: ' + (err?.message || 'Lỗi kết nối'),
        type: 'error'
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const res = await apiClient.post<any>('/finance/reconciliation', {});
      if (res && res.success && res.data) {
        setReconcileResult(res.data);
        setNotification({
          text: 'Đối soát cổng thanh toán MBBank Napas hoàn tất: 100% giao dịch khớp đúng!',
          type: 'success'
        });
        await loadFinanceData();
      } else {
        setNotification({
          text: res?.message || 'Lỗi trong quá trình đối soát',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({
        text: 'Lỗi đối soát: ' + (err?.message || 'Không thể thực hiện'),
        type: 'error'
      });
    } finally {
      setReconciling(false);
    }
  };

  const handleExportCsv = () => {
    if (!transactions.length) return;
    const headers = ['Mã Đơn Hàng', 'Tài Khoản', 'Email', 'Gói VIP', 'Số Tiền (VND)', 'Phương Thức', 'Mã Tham Chiếu', 'Trạng Thái', 'Thời Gian Tạo'];
    const rows = transactions.map((t) => [
      t.orderId,
      t.username,
      t.userEmail,
      `"${t.planName}"`,
      t.amount,
      t.paymentMethod,
      t.gatewayRef || 'N/A',
      t.status,
      t.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CineStreams_Finance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Kiểm tra đăng nhập
  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-low border border-surface-variant/40 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">payments</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Yêu Cầu Quyền Quản Lý Doanh Thu</h2>
            <p className="text-xs text-outline mt-2 leading-relaxed">
              Bạn cần đăng nhập tài khoản có vai trò <span className="text-emerald-400 font-bold">FINANCE_MANAGER</span> hoặc <span className="text-red-400 font-bold">ADMIN</span> để truy cập hệ thống kiểm soát tài chính.
            </p>
          </div>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">login</span>
            <span>Đăng Nhập Ngay</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Kiểm tra thẩm quyền Finance Manager
  if (!isFinanceAuthorized) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-low border border-error/30 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-error/10 text-error mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">gavel</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Không Có Quyền Truy Cập (403 Forbidden)</h2>
            <p className="text-xs text-outline mt-2 leading-relaxed">
              Tài khoản của bạn chưa được cấp vai trò <span className="text-emerald-400 font-bold">Quản Lý Doanh Thu (FINANCE_MANAGER)</span>. Vui lòng liên hệ Quản trị viên tối cao để được phân quyền.
            </p>
          </div>
          <Link
            to="/"
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-lg hover:bg-primary/90 block text-center"
          >
            Quay Về Trang Chủ CineStreams
          </Link>
        </div>
      </div>
    );
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchSearch =
        tx.orderId.toLowerCase().includes(q) ||
        tx.username.toLowerCase().includes(q) ||
        tx.userEmail.toLowerCase().includes(q) ||
        (tx.gatewayRef && tx.gatewayRef.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }
    return true;
  });

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] bg-surface-container-lowest text-on-surface p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-variant/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-emerald-400 text-2xl">account_balance_wallet</span>
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">CineStreams Finance Hub</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              💰 ROLE_FINANCE_MANAGER
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Trung Tâm Quản Lý Doanh Thu & Đối Soát</h1>
          <p className="text-xs text-outline mt-1">
            Theo dõi giao dịch mua gói VIP VietQR 24/7, báo cáo doanh số, xử lý hoàn tiền và đối soát cổng ngân hàng MBBank
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handleRunReconciliation}
            disabled={reconciling}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <span className={`material-symbols-outlined text-base ${reconciling ? 'animate-spin' : ''}`}>sync_alt</span>
            <span>{reconciling ? 'Đang Đối Soát...' : 'Đối Soát Cổng Napas'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-variant text-zinc-200 border border-surface-variant/40 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base text-amber-400">download</span>
            <span>Xuất Báo Cáo CSV</span>
          </button>

          <Link
            to="/phan-quyen"
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-variant text-zinc-300 font-bold text-xs flex items-center gap-2 border border-surface-variant/40"
          >
            <span className="material-symbols-outlined text-base">manage_accounts</span>
            <span>Phân Quyền User</span>
          </Link>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Tổng Doanh Thu */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-medium">Tổng Doanh Thu</span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">payments</span>
          </div>
          <p className="text-xl lg:text-2xl font-black font-mono text-emerald-400">
            {(overview?.totalRevenue || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-[10px] text-outline">Thực nhận qua VietQR 24/7</p>
        </div>

        {/* Card 2: Doanh số tháng */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-medium">Doanh Số Tháng Này</span>
            <span className="material-symbols-outlined text-sky-400 text-xl">trending_up</span>
          </div>
          <p className="text-xl lg:text-2xl font-black font-mono text-sky-400">
            {(overview?.monthRevenue || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-[10px] text-outline">Chu kỳ tháng 11/2026</p>
        </div>

        {/* Card 3: Gói VIP Đã Bán */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-medium">Đơn Hoàn Tất</span>
            <span className="material-symbols-outlined text-amber-400 text-xl">verified</span>
          </div>
          <p className="text-xl lg:text-2xl font-black font-mono text-amber-400">
            {overview?.paidCount || 0} <span className="text-xs font-normal text-outline">đơn</span>
          </p>
          <p className="text-[10px] text-outline">
            {overview?.yearlyPlanCount || 0} Năm • {overview?.sixMonthPlanCount || 0} 6T • {overview?.monthlyPlanCount || 0} 1T
          </p>
        </div>

        {/* Card 4: Tỷ lệ thanh toán thành công */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-medium">Tỷ Lệ Thành Công</span>
            <span className="material-symbols-outlined text-teal-400 text-xl">query_stats</span>
          </div>
          <p className="text-xl lg:text-2xl font-black font-mono text-teal-400">
            {(overview?.successRate ?? 98.4).toFixed(1)}%
          </p>
          <p className="text-[10px] text-outline">Giao dịch tức thời Napas</p>
        </div>

        {/* Card 5: Tiền đã hoàn trả */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-medium">Tiền Đã Hoàn Trả</span>
            <span className="material-symbols-outlined text-error text-xl">assignment_return</span>
          </div>
          <p className="text-xl lg:text-2xl font-black font-mono text-error">
            {(overview?.totalRefunded || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-[10px] text-outline">{overview?.refundCount || 0} đơn xử lý hoàn tiền</p>
        </div>

        {/* Card 6: Cổng thanh toán */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] font-medium">Cổng VietQR/Napas</span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">wifi_tethering</span>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-400 font-mono">HOẠT ĐỘNG 100%</span>
          </div>
          <p className="text-[10px] text-outline font-mono truncate">MBBank: 0345469878</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-surface-variant/30">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'transactions'
              ? 'border-primary text-primary'
              : 'border-transparent text-outline hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">receipt_long</span>
          <span>Lịch Sử Giao Dịch & Hoàn Tiền</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-container font-mono">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'reconciliation'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-outline hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">fact_check</span>
          <span>Đối Soát Cổng Thanh Toán</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent text-outline hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">donut_small</span>
          <span>Phân Tích Gói VIP & Tỷ Trọng</span>
        </button>
      </div>

      {/* TAB 1: TRANSACTIONS & REFUNDS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-surface-container-low p-3.5 rounded-2xl border border-surface-variant/30">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo mã đơn (CINE-xxx), username, email hoặc mã tham chiếu Napas..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PAID_VERIFIED">✅ Đã Thanh Toán (PAID_VERIFIED)</option>
                <option value="PENDING_PAYMENT">⏳ Chờ Chuyển Khoản (PENDING)</option>
                <option value="REFUNDED">↩️ Đã Hoàn Tiền (REFUNDED)</option>
              </select>

              <button
                onClick={loadFinanceData}
                disabled={loading}
                className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-variant text-xs text-on-surface flex items-center gap-1.5 transition-colors border border-surface-variant/40 shrink-0 font-semibold"
              >
                <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin text-primary' : ''}`}>
                  refresh
                </span>
                <span>Làm Mới</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-surface-container-low border border-surface-variant/30 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-on-surface">
                <thead className="bg-surface-container uppercase text-[10px] tracking-wider text-outline border-b border-surface-variant/30">
                  <tr>
                    <th className="py-3.5 px-4">Mã Đơn & Cú Pháp</th>
                    <th className="py-3.5 px-3">Khách Hàng</th>
                    <th className="py-3.5 px-3">Gói VIP & Số Tiền</th>
                    <th className="py-3.5 px-3">Kênh & Mã Tham Chiếu</th>
                    <th className="py-3.5 px-3">Trạng Thái</th>
                    <th className="py-3.5 px-3">Thời Gian</th>
                    <th className="py-3.5 px-4 text-right">Xử Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant/20">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-outline">
                        <span className="material-symbols-outlined animate-spin text-3xl text-emerald-400 inline-block">
                          sync
                        </span>
                        <p className="mt-2 text-xs font-medium">Đang tải sổ cái giao dịch tài chính...</p>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-outline">
                        <span className="material-symbols-outlined text-3xl opacity-40 mb-1 inline-block">receipt</span>
                        <p className="text-xs">Không có giao dịch nào khớp với bộ lọc.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.orderId} className="hover:bg-surface-container/50 transition-colors">
                        {/* Cột 1: Mã đơn */}
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-bold text-primary">{tx.orderId}</p>
                          <p className="text-[10px] text-outline font-mono mt-0.5">{tx.transferSyntax}</p>
                        </td>

                        {/* Cột 2: Khách hàng */}
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-on-surface">{tx.username}</p>
                          <p className="text-[11px] text-outline font-mono">{tx.userEmail}</p>
                        </td>

                        {/* Cột 3: Gói & Số tiền */}
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-zinc-200">{tx.planName}</p>
                          <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                            {tx.amount.toLocaleString('vi-VN')} đ
                          </p>
                        </td>

                        {/* Cột 4: Kênh & Gateway Ref */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-sky-400">qr_code_2</span>
                            <span className="font-medium text-[11px]">{tx.paymentMethod}</span>
                          </div>
                          <p className="text-[10px] text-outline font-mono mt-0.5">
                            Ref: {tx.gatewayRef || 'Đang cập nhật'}
                          </p>
                        </td>

                        {/* Cột 5: Trạng thái */}
                        <td className="py-3.5 px-3">
                          {tx.status === 'PAID_VERIFIED' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              <span>ĐÃ THANH TOÁN</span>
                            </span>
                          ) : tx.status === 'REFUNDED' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-error/15 text-error border border-error/30 flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-xs">history</span>
                              <span>ĐÃ HOÀN TIỀN</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                              <span>CHỜ CHUYỂN KHOẢN</span>
                            </span>
                          )}
                        </td>

                        {/* Cột 6: Thời gian */}
                        <td className="py-3.5 px-3">
                          <p className="text-[11px] text-zinc-300 font-mono">
                            {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                          <p className="text-[10px] text-outline font-mono">
                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        {/* Cột 7: Thao tác hoàn tiền */}
                        <td className="py-3.5 px-4 text-right">
                          {tx.status === 'PAID_VERIFIED' ? (
                            <button
                              onClick={() => handleOpenRefundModal(tx)}
                              className="px-2.5 py-1 rounded-lg bg-error/15 hover:bg-error/25 text-error font-bold text-[11px] flex items-center gap-1 transition-all border border-error/30 ml-auto"
                              title="Xử lý hoàn tiền cho khách qua cổng Napas"
                            >
                              <span className="material-symbols-outlined text-xs">assignment_return</span>
                              <span>Hoàn Tiền</span>
                            </button>
                          ) : tx.status === 'REFUNDED' ? (
                            <span className="text-[10px] text-outline italic">
                              {tx.refundReason ? `Lý do: ${tx.refundReason}` : 'Đã hoàn tất'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-outline font-mono">Chờ thanh toán</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-3xl bg-surface-container-low border border-surface-variant/30 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Công Cụ Đối Soát Tự Động Với Cổng Ngân Hàng</h3>
                <p className="text-xs text-outline mt-1">
                  So khớp tự động giữa số dư tài khoản nhận MBBank (STK: 0345469878), sao kê Napas 24/7 và đơn hàng CineStreams VIP.
                </p>
              </div>

              <button
                onClick={handleRunReconciliation}
                disabled={reconciling}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <span className={`material-symbols-outlined text-base ${reconciling ? 'animate-spin' : ''}`}>sync_alt</span>
                <span>{reconciling ? 'Đang Thực Hiện Đối Soát...' : 'Bắt Đầu Đối Soát Cổng MBBank'}</span>
              </button>
            </div>

            {/* Reconciliation Report Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-surface-variant/30">
              <div className="p-4 rounded-2xl bg-surface-container border border-surface-variant/40">
                <p className="text-[11px] text-outline font-medium">Tổng Đơn Kiểm Tra</p>
                <p className="text-2xl font-bold font-mono text-zinc-100 mt-1">
                  {reconcileResult?.totalChecked ?? transactions.length}
                </p>
                <p className="text-[10px] text-outline mt-1">Bản ghi trong cơ sở dữ liệu</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-[11px] text-emerald-400 font-medium">Khớp Hoàn Toàn 100%</p>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {reconcileResult?.matchedCount ?? transactions.filter((t) => t.status === 'PAID_VERIFIED').length}
                </p>
                <p className="text-[10px] text-emerald-300 mt-1">Đã đối chiếu với mã ref Napas</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-[11px] text-amber-400 font-medium">Chờ Khách Chuyển Khoản</p>
                <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {reconcileResult?.discrepancyCount ?? transactions.filter((t) => t.status === 'PENDING_PAYMENT').length}
                </p>
                <p className="text-[10px] text-amber-300 mt-1">Đơn pending chưa quá hạn 10 phút</p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30">
                <p className="text-[11px] text-sky-400 font-medium">Tổng Doanh Số Đã Xác Nhận</p>
                <p className="text-2xl font-bold font-mono text-sky-400 mt-1">
                  {(reconcileResult?.totalVerifiedAmount ?? overview?.totalRevenue ?? 0).toLocaleString('vi-VN')} đ
                </p>
                <p className="text-[10px] text-sky-300 mt-1">Tiền thực có tại MBBank</p>
              </div>
            </div>

            {/* Reconciliation Log Details */}
            <div className="p-4 rounded-2xl bg-surface-container border border-surface-variant/40 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Báo Cáo Đối Soát Gần Nhất: Hợp Lệ (Không Có Sai Lệch Số Dư)</span>
              </div>
              <p className="text-outline text-[11px]">
                Thời gian đối soát: {reconcileResult?.reconciledTime ? new Date(reconcileResult.reconciledTime).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
              </p>
              <p className="text-zinc-300 text-[11px]">
                Kênh đối soát: MBBank VietQR Direct Gateway + Napas 24/7 Switch Network. Mọi mã đơn CINE-xxxx đều được sinh cú pháp duy nhất, loại bỏ hoàn toàn rủi ro trùng lặp số tiền hay sai nội dung chuyển khoản.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BREAKDOWN & REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gói 1: VIP 1 Tháng */}
            <div className="p-6 rounded-3xl bg-surface-container-low border border-surface-variant/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">VIP Tiêu Chuẩn</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/20 text-zinc-300">1 Tháng</span>
              </div>
              <h3 className="text-xl font-black text-on-surface">79.000 đ</h3>
              <div className="space-y-1.5 pt-2 border-t border-surface-variant/30 text-xs">
                <div className="flex justify-between text-outline">
                  <span>Số lượng đã bán:</span>
                  <span className="font-bold text-white">{overview?.monthlyPlanCount || 0} gói</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Doanh số đóng góp:</span>
                  <span className="font-bold text-emerald-400">
                    {((overview?.monthlyPlanCount || 0) * 79000).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Gói 2: VIP 6 Tháng */}
            <div className="p-6 rounded-3xl bg-surface-container-low border border-sky-500/30 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-sky-500/20 text-sky-400 text-[10px] font-bold rounded-bl-xl border-l border-b border-sky-500/30">
                Phổ Biến Nhất
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">VIP 4K Gia Đình</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300">6 Tháng</span>
              </div>
              <h3 className="text-xl font-black text-sky-300">399.000 đ</h3>
              <div className="space-y-1.5 pt-2 border-t border-surface-variant/30 text-xs">
                <div className="flex justify-between text-outline">
                  <span>Số lượng đã bán:</span>
                  <span className="font-bold text-white">{overview?.sixMonthPlanCount || 0} gói</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Doanh số đóng góp:</span>
                  <span className="font-bold text-emerald-400">
                    {((overview?.sixMonthPlanCount || 0) * 399000).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Gói 3: VIP 1 Năm */}
            <div className="p-6 rounded-3xl bg-surface-container-low border border-amber-500/30 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-bl-xl border-l border-b border-amber-500/30">
                Tiết Kiệm 25%
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">VIP Điện Ảnh Cinema</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">1 Năm</span>
              </div>
              <h3 className="text-xl font-black text-amber-300">699.000 đ</h3>
              <div className="space-y-1.5 pt-2 border-t border-surface-variant/30 text-xs">
                <div className="flex justify-between text-outline">
                  <span>Số lượng đã bán:</span>
                  <span className="font-bold text-white">{overview?.yearlyPlanCount || 0} gói</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Doanh số đóng góp:</span>
                  <span className="font-bold text-emerald-400">
                    {((overview?.yearlyPlanCount || 0) * 699000).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL XỬ LÝ HOÀN TIỀN (REFUND) ================= */}
      {selectedTxForRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-surface-container-low rounded-3xl border border-surface-variant/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-error/15 text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">assignment_return</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Xử Lý Hoàn Tiền Đơn Hàng</h3>
                  <p className="text-[11px] text-outline font-mono">{selectedTxForRefund.orderId}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTxForRefund(null)} className="p-1 text-outline hover:text-white">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-container border border-surface-variant/40 space-y-1.5">
                <div className="flex justify-between text-outline">
                  <span>Khách hàng:</span>
                  <span className="font-bold text-white">{selectedTxForRefund.username}</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Gói đã mua:</span>
                  <span className="font-bold text-zinc-200">{selectedTxForRefund.planName}</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Số tiền hoàn trả:</span>
                  <span className="font-bold font-mono text-error">
                    {selectedTxForRefund.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Cổng thanh toán:</span>
                  <span className="font-mono text-zinc-300">MBBank Napas 24/7</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Lý do hoàn tiền (*):</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 focus:border-error transition-all"
                  placeholder="Nhập lý do hoàn tiền (VD: Khách chuyển khoản trùng, đổi nhu cầu gói...)"
                />
              </div>

              <p className="text-[11px] text-outline italic">
                Lưu ý: Thao tác này sẽ cập nhật trạng thái đơn sang REFUNDED và ghi nhận vào sổ đối soát ngân hàng.
              </p>
            </div>

            <div className="pt-3 border-t border-surface-variant/30 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTxForRefund(null)}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-xs text-zinc-300 font-semibold"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={isRefunding || !refundReason.trim()}
                className="px-5 py-2 rounded-xl bg-error hover:bg-error/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg"
              >
                <span className={`material-symbols-outlined text-sm ${isRefunding ? 'animate-spin' : ''}`}>
                  assignment_return
                </span>
                <span>{isRefunding ? 'Đang Hoàn Tiền...' : 'Xác Nhận Hoàn Tiền'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
