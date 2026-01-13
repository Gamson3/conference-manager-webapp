"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getConferenceById } from '../api/conferencesApi';
import type { Conference } from '@/types/conference';
import { useParams } from 'next/navigation';

interface ConferenceContextValue {
  conference?: Conference;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

const ConferenceContext = createContext<ConferenceContextValue | undefined>(undefined);

export function useConference() {
  const ctx = useContext(ConferenceContext);
  if (!ctx) throw new Error('useConference must be used within ConferenceProvider');
  return ctx;
}

export const ConferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const params = useParams<{ id?: string }>();
  const rawId = params.id;
  const id = rawId ? Number(rawId) : undefined;
  const [conference, setConference] = useState<Conference | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchConference = useCallback(async () => {
    if (!id || Number.isNaN(id)) return;
    setLoading(true);
    setError(undefined);
    try {
      const data = await getConferenceById(id);
      setConference(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load conference';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchConference(); }, [fetchConference]);

  return (
    <ConferenceContext.Provider value={{ conference, loading, error, refresh: fetchConference }}>
      {children}
    </ConferenceContext.Provider>
  );
};
