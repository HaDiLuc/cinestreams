import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { SearchModal } from './SearchModal';
import { NotificationDrawer } from './NotificationDrawer';
import { VipPaymentModal } from './VipPaymentModal';
import { AuthModal } from '../features/auth/AuthModal';

export const Layout: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      {/* Shell Fixed Header */}
      <Navbar />

      {/* Main Dynamic View Outlet */}
      <main className="flex-1 w-full pt-20">
        <Outlet />
      </main>

      {/* Shell Footer */}
      <Footer />

      {/* Mobile Sticky Bottom Nav */}
      <MobileNav />

      {/* Floating Modals and Drawers */}
      <SearchModal />
      <NotificationDrawer />
      <VipPaymentModal />
      <AuthModal />
    </div>
  );
};

