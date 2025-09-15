'use client';

import { useAuth } from '@/app/(auth)/authContext';
import { redirect } from 'next/navigation';
import DashboardPageLayout from '@/components/DashboardPageLayout';

export default function PresenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    redirect('/signin');
  }

  return (
    <DashboardPageLayout>
      {children}
    </DashboardPageLayout>
  );
}