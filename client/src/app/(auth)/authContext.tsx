"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';

type Role = 'attendee' | 'presenter' | 'organizer' | 'admin';

interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  cognitoId: string;
  image?: string;
  // Other user properties
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: Role) => boolean;
  isOrganizer: () => boolean;
  isAttendee: () => boolean;
  isPresenter: () => boolean;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hasRole: () => false,
  isOrganizer: () => false,
  isAttendee: () => false,
  isPresenter: () => false,
  isAdmin: () => false,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchUser = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      setIsLoading(true);
      console.log("[AUTH CONTEXT] Fetching user data");
    
      // Get current session
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        console.log("[AUTH CONTEXT] No token available");
        setUser(null);
        return;
      }

      // Create an authenticated API instance
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
        headers: {
          Authorization: `Bearer ${session.tokens.idToken.toString()}`,
        },
      });
      
      // Fetch user data from backend
      const response = await api.get("/users/ensure-and-get");
      
      // Only update state if the component is still mounted
      if (mountedRef.current) {
        if (response.data?.user) {
          setUser(response.data.user);
          
          // If we received a placeholder, retry after a delay
          if (response.data.user.isPlaceholder) {
            setTimeout(() => {
              if (mountedRef.current) fetchUser();
            }, 1000);
          }
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("[AUTH CONTEXT] Error fetching user:", error);
      if (mountedRef.current) setUser(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    fetchUser();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchUser]);

  // Role checking functions
  const hasRole = useCallback((role: Role): boolean => {
    return user?.roles?.includes(role) || false;
  }, [user]);

  const isOrganizer = useCallback((): boolean => hasRole('organizer'), [hasRole]);
  const isAttendee = useCallback((): boolean => hasRole('attendee'), [hasRole]);
  const isPresenter = useCallback((): boolean => hasRole('presenter'), [hasRole]);
  const isAdmin = useCallback((): boolean => hasRole('admin'), [hasRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        hasRole,
        isOrganizer,
        isAttendee,
        isPresenter,
        isAdmin,
        refreshUser: fetchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);