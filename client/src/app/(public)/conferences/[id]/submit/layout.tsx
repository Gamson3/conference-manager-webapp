"use client";

import React from 'react';
import { SubmissionProvider } from '@/contexts/SubmissionContext';

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <SubmissionProvider>{children}</SubmissionProvider>;
}
