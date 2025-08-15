'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationContextType {
  goToPreviousPage: (fallback?: string) => void;
  setPreviousPage: (path: string) => void;
  previousPage: string | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [previousPage, setPreviousPageState] = useState<string | null>(null);

  useEffect(() => {
    // Get stored previous page on mount
    const stored = sessionStorage.getItem('navigationPreviousPage');
    if (stored) {
      setPreviousPageState(stored);
    }
  }, []);

  useEffect(() => {
    // Don't track navigation within create-event workflow
    if (pathname.includes('/create-event')) {
      return;
    }

    // Store current page as previous page for next navigation
    sessionStorage.setItem('navigationPreviousPage', pathname);
    setPreviousPageState(pathname);
  }, [pathname]);

  const setPreviousPage = (path: string) => {
    sessionStorage.setItem('navigationPreviousPage', path);
    setPreviousPageState(path);
  };

  const goToPreviousPage = (fallback: string = '/') => {
    const stored = sessionStorage.getItem('navigationPreviousPage');
    const targetPage = stored || previousPage || fallback;

    // Clear stored page since we're using it
    sessionStorage.removeItem('navigationPreviousPage');

    if (targetPage && targetPage !== pathname) {
      router.push(targetPage);
    } else {
      router.push(fallback);
    }
  };

  return (
    <NavigationContext.Provider value={{ goToPreviousPage, setPreviousPage, previousPage }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};