"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';

type Role = 'attendee' | 'presenter' | 'organizer' | 'admin';

interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  cognitoId: string;
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
  const isInitialLoad = useRef(true);

  const fetchUser = async () => {
    // Skip if not initial load and already have user data
    if (!isInitialLoad.current && user) return;
    
    try {
      setIsLoading(true);
      console.log("[AUTH CONTEXT] Starting fetchUser");
    
      // Get current session
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        console.log("[AUTH CONTEXT] No token available, user not authenticated");
        setIsLoading(false);
        setUser(null);
        return;
      }
    
      // Create an authenticated API instance
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002",
        headers: {
          Authorization: `Bearer ${session.tokens.idToken.toString()}`,
        },
      });
    
      // First ensure the user exists
      try {
        console.log("[AUTH CONTEXT] Ensuring user exists in database");
        await api.post("/users/ensure");
        
        // Now fetch the user data
        console.log("[AUTH CONTEXT] Fetching user data");
        const response = await api.get("/users/me");
        
        console.log("[AUTH CONTEXT] User loaded:", response.data);
        setUser(response.data);
      } catch (error) {
        console.error("[AUTH CONTEXT] Error in user data flow:", error);
        if (axios.isAxiosError(error)) {
          console.error("[AUTH CONTEXT] Status:", error.response?.status);
          console.error("[AUTH CONTEXT] Data:", error.response?.data);
        }
        setUser(null);
      }
    } catch (error) {
      console.error("[AUTH CONTEXT] Error in auth session:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
      isInitialLoad.current = false;
    }
  };

  // Only fetch user data once on initial component mount
  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Role checking functions
  const hasRole = (role: Role): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const isOrganizer = (): boolean => hasRole('organizer');
  const isAttendee = (): boolean => hasRole('attendee');
  const isPresenter = (): boolean => hasRole('presenter');
  const isAdmin = (): boolean => hasRole('admin');

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