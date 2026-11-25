import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './features/home/HomePage';
import { MovieDetailPage } from './features/movie/MovieDetailPage';
import { PlayerPage } from './features/movie/PlayerPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { RankingPage } from './features/ranking/RankingPage';
import { VipPage } from './features/vip/VipPage';
import { WatchPartyPage } from './features/watchparty/WatchPartyPage';
import { CineAiPage } from './features/cineai/CineAiPage';
import { AccountPage } from './features/account/AccountPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ProfileSelectionPage } from './features/auth/ProfileSelectionPage';
import { AdminCmsPage } from './features/admin/AdminCmsPage';
import { UserPermissionPage } from './features/admin/UserPermissionPage';
import { FinanceManagementPage } from './features/finance/FinanceManagementPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 1. Trang chủ */}
          <Route index element={<HomePage />} />

          {/* 2. Danh mục & Bộ lọc */}
          <Route path="phim-le" element={<CatalogPage key="movie" initialType="movie" />} />
          <Route path="phim-bo" element={<CatalogPage key="series" initialType="series" />} />
          <Route path="hoat-hinh" element={<CatalogPage key="anime" initialType="anime" />} />
          <Route path="bo-loc" element={<CatalogPage key="all" initialType="all" />} />

          {/* 3. Bảng xếp hạng */}
          <Route path="bang-xep-hang" element={<RankingPage />} />

          {/* 4. Chi tiết phim & Chọn mùa/tập */}
          <Route path="phim/:id" element={<MovieDetailPage />} />
          <Route path="movie/:id" element={<MovieDetailPage />} />

          {/* 5. Trình phát video HLS 4K */}
          <Route path="xem-phim/:id" element={<PlayerPage />} />
          <Route path="watch/:id" element={<PlayerPage />} />
          <Route path="xem-phim" element={<PlayerPage />} />
          <Route path="watch" element={<PlayerPage />} />

          {/* 6. Gói VIP & Quét VietQR tự động */}
          <Route path="vip-goi-cuoc" element={<VipPage />} />

          {/* 7. Phòng xem chung Watch Party thời gian thực */}
          <Route path="watch-party" element={<WatchPartyPage />} />
          <Route path="watch-party/:roomId" element={<WatchPartyPage />} />

          {/* 8. Trợ lý điện ảnh CineAI */}
          <Route path="tro-ly-phim-ai" element={<CineAiPage />} />

          {/* 9. Quản lý tài khoản & Lịch sử */}
          <Route path="tai-khoan" element={<AccountPage />} />

          {/* 10. Đăng Nhập, Đăng Ký & Quản lý hồ sơ gia đình */}
          <Route path="dang-nhap" element={<LoginPage />} />
          <Route path="dang-ky" element={<RegisterPage />} />
          <Route path="ho-so" element={<ProfileSelectionPage />} />

          {/* 11. CMS Quản Trị & Đăng Tải Phim (Content Editor, Moderator, Admin) */}
          <Route path="quan-tri-phim" element={<AdminCmsPage />} />
          {/* 12. Quản Trị Phân Quyền & Người Dùng (Admin) */}
          <Route path="quan-ly-phan-quyen" element={<UserPermissionPage />} />
          <Route path="phan-quyen" element={<UserPermissionPage />} />

          {/* 13. Quản Lý Doanh Thu & Đối Soát (Finance Manager, Admin) */}
          <Route path="quan-ly-doanh-thu" element={<FinanceManagementPage />} />
          <Route path="tai-chinh" element={<FinanceManagementPage />} />

          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
