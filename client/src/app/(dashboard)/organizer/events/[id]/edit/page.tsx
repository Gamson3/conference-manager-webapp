'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { EventForm } from '@/components/EventForm';
import { updateEvent } from '@/lib/actions/events';
import axios from 'axios';

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${id}`)
      .then(res => setEvent(res.data))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (formData: any) => {
    const response = await updateEvent(Number(id), formData);
    if (response.success) {
      router.push(`/organizer/events/${id}`);
    } else {
      alert(response.error);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Edit Event</h1>
      <EventForm initialValues={event} onSubmit={handleSubmit} isLoading={false} />
    </div>
  );
}