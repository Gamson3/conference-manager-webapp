import React from "react";
import { cn } from "@/lib/utils";
import { Section } from "@/types/scheduleBuilder";

interface FixedSessionCardProps {
  session: Section;
}

export function FixedSessionCard({ session }: FixedSessionCardProps) {
  const getSessionColor = () => {
    switch (session.type) {
      case "keynote":
        return "bg-purple-100 border-purple-300 text-purple-800";
      case "break":
        return "bg-orange-100 border-orange-300 text-orange-800";
      case "lunch":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "opening":
        return "bg-indigo-100 border-indigo-300 text-indigo-800";
      case "closing":
        return "bg-indigo-100 border-indigo-300 text-indigo-800";
      case "networking":
        return "bg-green-100 border-green-300 text-green-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  return (
    <div className={cn("border rounded p-3", getSessionColor())}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h5 className="font-medium text-sm">{session.name}</h5>
          {session.room && (
            <p className="text-xs opacity-75 mt-1">{session.room}</p>
          )}
        </div>
        <div className="text-xs opacity-75">
          {session.startTime &&
            session.endTime &&
            `${new Date(session.startTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })} - ${new Date(session.endTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}`}
        </div>
      </div>
    </div>
  );
}