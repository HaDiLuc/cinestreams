import { create } from 'zustand';
import { VipPlan } from '../types';
import { VIP_PLANS } from '../data/plansData';
import { apiClient } from '../services/apiClient';

interface VietQrOrder {
  orderId: string;
  amount: number;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  syntax: string;
  qrUrl: string;
  expiresInSeconds: number;
}

interface VipState {
  plans: VipPlan[];
  selectedPlan: VipPlan;
  billingCycle: 'monthly' | 'yearly';
  isPaymentModalOpen: boolean;
  paymentStatus: 'idle' | 'generating' | 'pending' | 'success' | 'failed';
  currentOrder: VietQrOrder | null;
  secondsRemaining: number;
  voucherCode: string;
  voucherDiscountPercent: number;

  // Actions
  setSelectedPlan: (plan: VipPlan) => void;
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  openPaymentModal: (plan?: VipPlan) => void;
  closePaymentModal: () => void;
  applyVoucher: (code: string) => boolean;
  generateVietQrPayment: () => Promise<void>;
  checkPaymentStatus: () => Promise<boolean>;
  simulatePaymentSuccess: () => void;
  decrementTimer: () => void;
}

export const useVipStore = create<VipState>((set, get) => ({
  plans: VIP_PLANS,
  selectedPlan: VIP_PLANS[1], // Default to popular
  billingCycle: 'monthly',
  isPaymentModalOpen: false,
  paymentStatus: 'idle',
  currentOrder: null,
  secondsRemaining: 600,
  voucherCode: '',
  voucherDiscountPercent: 0,

  setSelectedPlan: (plan) => set({ selectedPlan: plan }),
  setBillingCycle: (cycle) => set({ billingCycle: cycle }),
  
  openPaymentModal: (plan) => {
    if (plan) {
      set({ selectedPlan: plan });
    }
    set({ isPaymentModalOpen: true });
    get().generateVietQrPayment();
  },

  closePaymentModal: () => {
    set({ isPaymentModalOpen: false, paymentStatus: 'idle', currentOrder: null });
  },

  applyVoucher: (code) => {
    const clean = code.trim().toUpperCase();
    if (clean === 'VIP2025' || clean === 'CINESTREAM') {
      set({ voucherCode: clean, voucherDiscountPercent: 20 });
      return true;
    }
    return false;
  },

  generateVietQrPayment: async () => {
    set({ paymentStatus: 'generating' });
    const { selectedPlan, billingCycle, voucherDiscountPercent } = get();
    
    let basePrice = billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly;
    if (voucherDiscountPercent > 0) {
      basePrice = Math.round(basePrice * (1 - voucherDiscountPercent / 100));
    }

    // Kết nối API VietQR backend
    try {
      const res = await apiClient.post<any>('/vietqr/generate', {
        planId: selectedPlan.id,
        amount: basePrice,
        billingCycle
      });

      const resData: any = res?.data || res;
      if (res && res.success && resData?.orderId) {
        const order: VietQrOrder = {
          orderId: resData.orderId,
          amount: resData.amount || basePrice,
          planId: resData.planId || selectedPlan.id,
          billingCycle: resData.billingCycle || billingCycle,
          bankCode: resData.bankCode || 'MB',
          bankName: resData.bankName || 'MBBank (Ngân hàng TMCP Quân Đội)',
          accountNumber: resData.accountNumber || '0345469878',
          accountName: resData.accountName || 'HA DINH LUC',
          syntax: resData.syntax || `CS ${resData.orderId}`,
          qrUrl: resData.qrUrl,
          expiresInSeconds: resData.expiresInSeconds || 600
        };
        set({ currentOrder: order, paymentStatus: 'pending', secondsRemaining: order.expiresInSeconds });
        return;
      }
    } catch (_err) {
      console.warn('[VietQR] API /vietqr/generate fallback to local generator');
    }

    // Fallback nếu API offline
    const orderId = 'CS' + Math.floor(100000 + Math.random() * 900000);
    const syntax = `CS ${orderId}`;
    const bankCode = 'MB';
    const accountNumber = '0345469878';
    const accountName = 'HA DINH LUC';
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${basePrice}&addInfo=${encodeURIComponent(syntax)}&accountName=${encodeURIComponent(accountName)}`;

    const order: VietQrOrder = {
      orderId,
      amount: basePrice,
      planId: selectedPlan.id,
      billingCycle,
      bankCode,
      bankName: 'MBBank (Ngân hàng TMCP Quân Đội)',
      accountNumber,
      accountName,
      syntax,
      qrUrl,
      expiresInSeconds: 600
    };

    set({ currentOrder: order, paymentStatus: 'pending', secondsRemaining: 600 });
  },

  checkPaymentStatus: async () => {
    const { currentOrder } = get();
    if (!currentOrder) return false;

    try {
      const res = await apiClient.get<any>(`/vietqr/verify/${currentOrder.orderId}`);
      const resData: any = res?.data || res;
      if (res && (resData?.status === 'PAID_VERIFIED' || res.success)) {
        set({ paymentStatus: 'success' });
        return true;
      }
    } catch (_err) {}
    return false;
  },

  simulatePaymentSuccess: () => {
    set({ paymentStatus: 'success' });
  },

  decrementTimer: () => {
    const { secondsRemaining } = get();
    if (secondsRemaining > 0) {
      set({ secondsRemaining: secondsRemaining - 1 });
    } else {
      set({ paymentStatus: 'failed' });
    }
  }
}));
