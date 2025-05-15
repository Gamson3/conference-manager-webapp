// app/create-event/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGetAuthUserQuery } from '@/state/api';
import { EventForm } from '@/components/EventForm';
import { createEvent } from '@/lib/actions/events';

export default function CreateEventPage() {
  const router = useRouter();
  const { data: authUser, isLoading: userLoading } = useGetAuthUserQuery();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span>Loading...</span>
      </div>
    );
  }

  if (!authUser?.userInfo?.id) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (formData: any) => {
    try {
      setIsLoading(true);
      setError(null);

      const eventData = {
        ...formData,
        createdById: authUser.userInfo.id, // Prisma: Conference.createdById
      };

      const response = await createEvent(eventData);

      if (response.success) {
        router.push(`/organizer/events/${response.data.id}`);
      } else {
        setError(response.error || 'Failed to create event');
      }

    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Create event error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const initialValues = {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Event</h1>
      {error && (
        <div className="mb-4 text-red-600 border border-red-300 rounded p-2 bg-red-50">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <span>Creating event...</span>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <EventForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}