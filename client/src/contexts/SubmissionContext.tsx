"use client";

import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

interface SubmissionDraft {
  id: number;
  conferenceId: number;
  title?: string;
  abstract?: string;
  keywords?: string[];
  categoryId?: number | null;
  typeId?: number | null;
  authors?: Array<{
    firstName?: string;
    lastName?: string;
    email?: string;
    affiliation?: string;
    phone?: string;
    orcid?: string;
    isPresentingAuthor?: boolean;
  }>;
}

export interface Author {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string;
  phone: string;
  orcid: string;
  isPresentingAuthor: boolean;
}

export interface SubmissionData {
  draftId: number | null;
  conferenceId: string | number | null; // Supports both slug and numeric ID
  title: string;
  abstract: string;
  keywords: string[];
  categoryId: number | null;
  typeId: number | null;
  authors: Author[];
  uploadedFile: File | null;
  fullTextFile: File | null;
  onBehalfOfUserId: number | null; // For organizer assistance - delegated submissions
}

interface SubmissionContextType {
  data: SubmissionData;
  setTitle: (title: string) => void;
  setAbstract: (abstract: string) => void;
  setKeywords: (keywords: string[]) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  setCategoryId: (id: number | null) => void;
  setTypeId: (id: number | null) => void;
  setAuthors: (authors: Author[]) => void;
  addAuthor: () => void;
  removeAuthor: (id: string) => void;
  updateAuthor: <K extends keyof Author>(id: string, field: K, value: Author[K]) => void;
  setUploadedFile: (file: File | null) => void;
  setFullTextFile: (file: File | null) => void;
  setConferenceId: (id: string | number) => void; // Accepts slug or numeric ID
  setOnBehalfOfUserId: (id: number | null) => void; // For organizer assistance
  loadDraft: (draft: SubmissionDraft) => void;
  resetSubmission: () => void;
}

const SubmissionContext = createContext<SubmissionContextType | undefined>(undefined);

const initialData: SubmissionData = {
  draftId: null,
  conferenceId: null,
  title: '',
  abstract: '',
  keywords: [],
  categoryId: null,
  typeId: null,
  authors: [],
  uploadedFile: null,
  fullTextFile: null,
  onBehalfOfUserId: null,
};

export function SubmissionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SubmissionData>(initialData);

  const setTitle = useCallback((title: string): void => {
    setData(prev => ({ ...prev, title }));
  }, []);

  const setAbstract = useCallback((abstract: string): void => {
    setData(prev => ({ ...prev, abstract }));
  }, []);

  const setKeywords = useCallback((keywords: string[]): void => {
    setData(prev => ({ ...prev, keywords }));
  }, []);

  const addKeyword = useCallback((keyword: string): void => {
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setData(prev => {
      if (prev.keywords.includes(trimmed)) return prev;
      return { ...prev, keywords: [...prev.keywords, trimmed] };
    });
  }, []);

  const removeKeyword = useCallback((keyword: string): void => {
    setData(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== keyword) }));
  }, []);

  const setCategoryId = useCallback((categoryId: number | null): void => {
    setData(prev => ({ ...prev, categoryId }));
  }, []);

  const setTypeId = useCallback((typeId: number | null): void => {
    setData(prev => ({ ...prev, typeId }));
  }, []);

  const setAuthors = useCallback((authors: Author[]): void => {
    setData(prev => ({ ...prev, authors }));
  }, []);

  const addAuthor = useCallback((): void => {
    setData(prev => {
      const newAuthor: Author = {
        id: `author-${Date.now()}`,
        firstName: '',
        lastName: '',
        email: '',
        affiliation: '',
        phone: '',
        orcid: '',
        isPresentingAuthor: prev.authors.length === 0,
      };
      return { ...prev, authors: [...prev.authors, newAuthor] };
    });
  }, []);

  const removeAuthor = useCallback((id: string): void => {
    setData(prev => {
      const authorToRemove = prev.authors.find(a => a.id === id);
      const newAuthors = prev.authors.filter(a => a.id !== id);
      
      if (authorToRemove?.isPresentingAuthor && newAuthors.length > 0) {
        newAuthors[0].isPresentingAuthor = true;
      }
      
      return { ...prev, authors: newAuthors };
    });
  }, []);

  const updateAuthor = useCallback(
    <K extends keyof Author>(id: string, field: K, value: Author[K]): void => {
      setData(prev => ({
        ...prev,
        authors: prev.authors.map(author => {
          if (field === 'isPresentingAuthor' && value === true && author.id !== id) {
            return { ...author, isPresentingAuthor: false };
          }
          if (author.id !== id) return author;

          if (field === 'isPresentingAuthor') {
            return { ...author, isPresentingAuthor: value === true };
          }

          return { ...author, [field]: value };
        }),
      }));
    },
    []
  );

  const setUploadedFile = useCallback((uploadedFile: File | null): void => {
    setData(prev => ({ ...prev, uploadedFile }));
  }, []);

  const setFullTextFile = useCallback((fullTextFile: File | null): void => {
    setData(prev => ({ ...prev, fullTextFile }));
  }, []);

  const setConferenceId = useCallback((conferenceId: string | number): void => {
    setData(prev => ({ ...prev, conferenceId }));
  }, []);

  const setOnBehalfOfUserId = useCallback((onBehalfOfUserId: number | null): void => {
    setData(prev => {
      if (prev.onBehalfOfUserId === onBehalfOfUserId) return prev;
      return { ...prev, onBehalfOfUserId };
    });
  }, []);

  const loadDraft = useCallback((draft: SubmissionDraft): void => {
    const authors = draft.authors || [];
    
    setData(prev => ({
      draftId: draft.id,
      conferenceId: draft.conferenceId,
      title: draft.title || '',
      abstract: draft.abstract || '',
      keywords: draft.keywords || [],
      categoryId: draft.categoryId || null,
      typeId: draft.typeId || null,
      authors: authors.map((a, index: number) => ({
        id: `author-${index}`,
        firstName: a.firstName || '',
        lastName: a.lastName || '',
        email: a.email || '',
        affiliation: a.affiliation || '',
        phone: a.phone || '',
        orcid: a.orcid || '',
        isPresentingAuthor: a.isPresentingAuthor || false,
      })),
      uploadedFile: null, // Files cannot be restored from draft
      fullTextFile: null,
      onBehalfOfUserId: prev.onBehalfOfUserId, // Preserve onBehalfOfUserId when loading draft
    }));
  }, []);

  const resetSubmission = useCallback((): void => {
    setData(initialData);
  }, []);

  const contextValue = useMemo<SubmissionContextType>(
    () => ({
      data,
      setTitle,
      setAbstract,
      setKeywords,
      addKeyword,
      removeKeyword,
      setCategoryId,
      setTypeId,
      setAuthors,
      addAuthor,
      removeAuthor,
      updateAuthor,
      setUploadedFile,
      setFullTextFile,
      setConferenceId,
      setOnBehalfOfUserId,
      loadDraft,
      resetSubmission,
    }),
    [
      data,
      setTitle,
      setAbstract,
      setKeywords,
      addKeyword,
      removeKeyword,
      setCategoryId,
      setTypeId,
      setAuthors,
      addAuthor,
      removeAuthor,
      updateAuthor,
      setUploadedFile,
      setFullTextFile,
      setConferenceId,
      setOnBehalfOfUserId,
      loadDraft,
      resetSubmission,
    ]
  );

  return (
    <SubmissionContext.Provider
      value={contextValue}
    >
      {children}
    </SubmissionContext.Provider>
  );
}

export function useSubmission() {
  const context = useContext(SubmissionContext);
  if (!context) {
    throw new Error('useSubmission must be used within a SubmissionProvider');
  }
  return context;
}
