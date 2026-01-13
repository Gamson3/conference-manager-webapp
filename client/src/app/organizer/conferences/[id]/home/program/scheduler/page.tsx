"use client";

import { useParams } from "next/navigation";
import { ScheduleBuilder } from "@/components/scheduler";

export default function SchedulerPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  if (!conferenceId || Number.isNaN(conferenceId)) {
    return (
      <div className="p-4">
        <p className="text-destructive">Invalid conference ID</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ScheduleBuilder conferenceId={conferenceId} />
    </div>
  );
}
