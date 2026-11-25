import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-low/95 mt-space-xl border-t border-surface-variant/30 pb-20 lg:pb-0">
      <div className="w-full px-gutter py-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-lg mb-space-xl">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-space-md">
            <Logo size="sm" />
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm leading-relaxed">
              Nền tảng phát trực tuyến chuẩn điện ảnh hàng đầu với chất lượng 4K Dolby Vision và âm
              thanh vòm Dolby Atmos. Trải nghiệm kho phim chọn lọc cùng trí tuệ nhân tạo CineAI thế
              hệ mới.
            </p>
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-tertiary font-label-caps text-label-caps">
                DOLBY VISION
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-caps text-label-caps">
                4K ULTRA HD
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-secondary font-label-caps text-label-caps">
                CINE AI
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-label-lg text-label-lg text-on-surface mb-space-md font-bold">
              Khám Phá
            </h4>
            <ul className="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <Link to="/phim-le" className="hover:text-primary transition-colors">
                  Phim Chiếu Rạp Mới
                </Link>
              </li>
              <li>
                <Link to="/phim-bo" className="hover:text-primary transition-colors">
                  Series Độc Quyền VIP
                </Link>
              </li>
              <li>
                <Link to="/hoat-hinh" className="hover:text-primary transition-colors">
                  Anime & Hoạt Họa 4K
                </Link>
              </li>
              <li>
                <Link to="/bang-xep-hang" className="hover:text-primary transition-colors">
                  Top 10 Thịnh Hành
                </Link>
              </li>
              <li>
                <Link to="/tro-ly-phim-ai" className="hover:text-primary transition-colors">
                  CineAI Gợi Ý Phim
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="font-label-lg text-label-lg text-on-surface mb-space-md font-bold">
              Hỗ Trợ & Pháp Lý
            </h4>
            <ul className="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <a href="#support" className="hover:text-primary transition-colors">
                  Trung Tâm Trợ Giúp 24/7
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-primary transition-colors">
                  Điều Khoản Sử Dụng
                </a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-primary transition-colors">
                  Chính Sách Quyền Riêng Tư
                </a>
              </li>
              <li>
                <a href="#dmca" className="hover:text-primary transition-colors">
                  Bản Quyền & DMCA
                </a>
              </li>
              <li>
                <Link to="/vip-goi-cuoc" className="hover:text-primary transition-colors">
                  Quyền Lợi Hội Viên VIP
                </Link>
              </li>
            </ul>
          </div>

          {/* Payment & App download */}
          <div>
            <h4 className="font-label-lg text-label-lg text-on-surface mb-space-md font-bold">
              Thanh Toán & Ứng Dụng
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
              Phương thức thanh toán tức thì:
            </p>
            <div className="flex flex-wrap gap-space-xs mb-space-md">
              <span className="px-2 py-1 rounded bg-surface-container text-xs text-primary font-semibold border border-primary/20">
                VietQR 24/7
              </span>
              <span className="px-2 py-1 rounded bg-surface-container text-xs text-on-surface font-semibold">
                MoMo
              </span>
              <span className="px-2 py-1 rounded bg-surface-container text-xs text-on-surface font-semibold">
                Visa
              </span>
              <span className="px-2 py-1 rounded bg-surface-container text-xs text-on-surface font-semibold">
                Mastercard
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
              Tải ứng dụng CineStreams:
            </p>
            <div className="flex gap-space-xs flex-wrap">
              <div className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface flex items-center gap-1.5 font-label-md text-label-md hover:bg-surface-bright cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-sm text-tertiary">tv</span>
                Smart TV
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface flex items-center gap-1.5 font-label-md text-label-md hover:bg-surface-bright cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-sm text-primary">phone_iphone</span>
                iOS / Android
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & certification bar */}
        <div className="pt-space-lg border-t border-surface-variant/30 flex flex-col sm:flex-row items-center justify-between gap-space-md text-outline font-body-sm text-body-sm">
          <p>© 2025 CineStreams Entertainment Inc. Giấy phép cung cấp dịch vụ phát thanh, truyền hình trả tiền số 184/GP-BTTTT.</p>
          <div className="flex items-center gap-space-md flex-wrap text-xs">
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm text-primary">verified_user</span>
              Bảo mật dữ liệu 256-bit
            </span>
            <span className="text-outline">|</span>
            <span className="text-on-surface-variant">Hạ tầng CDN Việt Nam siêu tốc</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
