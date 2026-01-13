"use client";
import React from 'react';
import { AboutTab, type ConferenceAboutData } from '@/features/conferences/components/tabs';

interface AboutSectionProps {
  conference: ConferenceAboutData;
}

export function AboutSection({ conference }: AboutSectionProps) {
  return (
    <section id="about-section" className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-6">About This Conference</h2>
        <AboutTab conference={conference} />
      </div>
    </section>
  );
}
