import React from "react";
import MainNav from '@/components/layouts/MainNav';
// import Footer from '@/app/(public)/landing/Footer';
import AccountSidebar from '@/components/layouts/AccountSidebar';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNav />
      <div className="flex-1 flex">
        <AccountSidebar />
        <main className="flex-1 overflow-auto">
          <div className="app-container py-6">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
