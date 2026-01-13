"use client";

import { useState, useCallback, useEffect } from "react";
import apiClient from "@/lib/api/client";

/**
 * Impersonated user data stored in session.
 */
export interface ImpersonatedUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Full impersonation state including conference context.
 */
export interface ImpersonationState {
  impersonatedUser: ImpersonatedUser;
  conferenceId: number;
  conferenceName: string;
  impersonatedBy: number;
  startedAt: string;
}

const STORAGE_KEY = "impersonationState";

/**
 * Retrieve stored impersonation state from sessionStorage.
 */
function getStoredState(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ImpersonationState;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Persist impersonation state to sessionStorage.
 */
function setStoredState(state: ImpersonationState | null): void {
  if (typeof window === "undefined") return;
  if (state) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

interface UseImpersonationReturn {
  /** Current impersonation state or null if not impersonating. */
  impersonation: ImpersonationState | null;
  /** True if currently impersonating a user. */
  isImpersonating: boolean;
  /** Start impersonation for a user in a conference. */
  startImpersonation: (
    conferenceId: number,
    userId: number,
    conferenceName: string
  ) => Promise<void>;
  /** End the current impersonation session. */
  endImpersonation: () => Promise<void>;
  /** Loading state for impersonation actions. */
  loading: boolean;
  /** Error message if an action failed. */
  error: string | null;
}

/**
 * Hook to manage organizer impersonation of conference participants.
 *
 * Impersonation allows organizers to view the conference as a specific
 * participant would see it, useful for troubleshooting and support.
 *
 * State is stored in sessionStorage and cleared when the session ends.
 */
export function useImpersonation(): UseImpersonationReturn {
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(
    () => getStoredState()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with sessionStorage on mount (handles tab switching)
  useEffect(() => {
    const handleStorage = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEY) {
        setImpersonation(getStoredState());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const startImpersonation = useCallback(
    async (
      conferenceId: number,
      userId: number,
      conferenceName: string
    ): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.post<{
          message: string;
          impersonatedUser: ImpersonatedUser;
          conferenceId: number;
          impersonatedBy: number;
        }>(`/api/organizer/conferences/${conferenceId}/impersonate/${userId}`);

        const state: ImpersonationState = {
          impersonatedUser: response.data.impersonatedUser,
          conferenceId: response.data.conferenceId,
          conferenceName,
          impersonatedBy: response.data.impersonatedBy,
          startedAt: new Date().toISOString(),
        };

        setStoredState(state);
        setImpersonation(state);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start impersonation";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const endImpersonation = useCallback(async (): Promise<void> => {
    if (!impersonation) return;

    setLoading(true);
    setError(null);

    try {
      await apiClient.post(
        `/api/organizer/conferences/${impersonation.conferenceId}/impersonate/end`
      );

      setStoredState(null);
      setImpersonation(null);
    } catch {
      // Clear local state even if API fails (session may have expired)
      setStoredState(null);
      setImpersonation(null);
    } finally {
      setLoading(false);
    }
  }, [impersonation]);

  return {
    impersonation,
    isImpersonating: impersonation !== null,
    startImpersonation,
    endImpersonation,
    loading,
    error,
  };
}
