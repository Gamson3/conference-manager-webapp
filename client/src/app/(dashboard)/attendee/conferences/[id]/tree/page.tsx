"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import ConferenceTreeView from '@/components/ConferenceTreeView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ConferenceTreePage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = Number(params.id);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          // size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Conference Schedule</h1>
          <p className="text-gray-600 text-xs">Navigate through the complete conference program</p>
        </div>
      </div>

      {/* Tree View Component */}
      <ConferenceTreeView
        conferenceId={conferenceId}
        showSearch={true}
        expandedByDefault={false}
        onPresentationSelect={(presentation) => {
          router.push(`/attendee/presentations/${presentation.id}`);
        }}
      />
    </div>
  );
}