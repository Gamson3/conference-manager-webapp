"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import axios from "axios";

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${id}`)
      .then((res) => setEvent(res.data))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span>Loading...</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
        <Button onClick={() => router.push("/organizer/events")}>Back to Events</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-4">{event.name}</h1>
      <div className="mb-4">
        <span className="font-semibold">Description:</span>
        <p>{event.description}</p>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Start:</span> {event.startDate ? new Date(event.startDate).toLocaleString() : "N/A"}
      </div>
      <div className="mb-2">
        <span className="font-semibold">End:</span> {event.endDate ? new Date(event.endDate).toLocaleString() : "N/A"}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Location:</span> {event.location}
      </div>

      <div className="flex gap-4 mt-6">
        <Button 
        onClick={() => router.push(`/organizer/events/${event.id}/edit`)}
        className="hover:bg-primary-700 hover:text-white cursor-pointer"
          >
          Edit
        </Button>
        <Button 
         variant="outline" 
         onClick={() => router.push("/organizer/events")}
         className="hover:bg-primary-700 hover:text-white cursor-pointer"
        >
          Back to Events
        </Button>
      </div>
    </div>
  );
}