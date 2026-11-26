import { VipPlan } from '../types';

export const VIP_PLANS: VipPlan[] = [
  {
    id: 'vip-standard',
    name: 'Cá Nhân (Standard)',
    badge: 'Cơ Bản',
    priceMonthly: 49000,
    priceYearly: 490000,
    features: [
      'Xem không giới hạn 5.000+ tựa phim',
      'Độ phân giải Full HD 1080p',
      'Âm thanh Stereo 2.0',
      '1 thiết bị xem cùng lúc',
      'Tải xem offline tối đa 10 phim'
    ],
    maxDevices: 1,
    resolution: 'Full HD 1080p',
    sound: 'Stereo 2.0'
  },
  {
    id: 'vip-premium',
    name: 'Cao Cấp (Premium 4K)',
    badge: 'PHỔ BIẾN NHẤT',
    priceMonthly: 89000,
    priceYearly: 890000,
    discountBadge: 'Tiết kiệm 20%',
    isPopular: true,
    features: [
      'Toàn bộ đặc quyền gói Cá Nhân',
      'Chất lượng 4K Ultra HD & Dolby Vision',
      'Âm thanh vòm Dolby Atmos chuẩn rạp hát',
      '2 thiết bị xem cùng lúc',
      'Tải xem offline không giới hạn',
      'Tham gia phòng Watch Party không giới hạn',
      'Trợ lý CineAI DeepSemantic ưu tiên'
    ],
    maxDevices: 2,
    resolution: '4K Ultra HD + HDR10',
    sound: 'Dolby Atmos 7.1'
  },
  {
    id: 'vip-family',
    name: 'Gia Đình (Family Ultra)',
    badge: 'TIẾT KIỆM TỐI ĐA',
    priceMonthly: 149000,
    priceYearly: 1390000,
    discountBadge: 'Tặng thêm 3 tháng',
    features: [
      'Toàn bộ quyền lợi gói Cao Cấp',
      '4 thiết bị phát đồng thời không nghẽn băng thông',
      'Tạo 5 hồ sơ thành viên riêng biệt (có Chế độ Trẻ Em)',
      'Hỗ trợ kỹ thuật VIP 24/7 riêng biệt',
      'Kích hoạt thanh toán tự động qua VietQR 3 giây'
    ],
    maxDevices: 4,
    resolution: '4K IMAX Enhanced',
    sound: 'Dolby Atmos + Spatial Audio'
  }
];
