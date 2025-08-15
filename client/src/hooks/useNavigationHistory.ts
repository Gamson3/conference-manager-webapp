'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export const useNavigationHistory = (fallbackPath: string = '/') => {
  const router = useRouter();
  const previousPathRef = useRef<string>(fallbackPath);

  useEffect(() => {
    // Store the current path as previous when component mounts
    const currentPath = window.location.pathname + window.location.search;
    
    // Get the stored previous path from sessionStorage
    const storedPreviousPath = sessionStorage.getItem('previousPath');
    
    if (storedPreviousPath && storedPreviousPath !== currentPath) {
      previousPathRef.current = storedPreviousPath;
    }

    // Store current path for next navigation
    return () => {
      sessionStorage.setItem('previousPath', currentPath);
    };
  }, []);

  const goBack = () => {
    const previousPath = previousPathRef.current;
    
    // Clear the stored path since we're using it
    sessionStorage.removeItem('previousPath');
    
    // Navigate back to previous path
    if (previousPath && previousPath !== window.location.pathname) {
      router.push(previousPath);
    } else {
      // Fallback to browser back or provided fallback
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push(fallbackPath);
      }
    }
  };

  return { goBack, previousPath: previousPathRef.current };
};