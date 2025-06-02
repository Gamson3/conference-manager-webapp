"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAuthenticatedApi } from "@/lib/utils";

export interface Conference {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  venue?: string;
  timezone?: string;
  bannerImageUrl?: string;
  topics?: string[];
  organizer: string;
  website?: string;
  contact?: string;
}

interface ConferenceCardProps {
  conf: Conference;
  showRegister?: boolean; // Optional: hide register button if not needed
}

const ConferenceCard: React.FC<ConferenceCardProps> = ({ conf, showRegister = true }) => {
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const api = await createAuthenticatedApi();
      await api.post("/attendee/register-conference", { conferenceId: conf.id });
      toast.success("Registered!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow border-none">
      {conf.bannerImageUrl && (
        <img
          src={conf.bannerImageUrl}
          alt={conf.name}
          className="w-full h-40 object-cover rounded-t-lg"
          style={{ objectFit: "cover" }}
        />
      )}
      <CardContent className="flex-grow p-6">
        <h2 className="font-bold mb-2 text-xl line-clamp-2 text-indigo-700">
          {conf.name}
        </h2>
        <div className="flex items-center text-gray-500 mb-1">
          <CalendarIcon className="h-4 w-4 mr-2" />
          <span className="text-sm">
            {new Date(conf.startDate).toLocaleDateString()} - {new Date(conf.endDate).toLocaleDateString()}
          </span>
          {conf.timezone && (
            <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">{conf.timezone}</span>
          )}
        </div>
        <div className="flex items-center text-gray-500 mb-1">
          <MapPinIcon className="h-4 w-4 mr-2" />
          <span className="text-sm">{conf.location}</span>
          {conf.venue && (
            <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">{conf.venue}</span>
          )}
        </div>
        <div className="flex items-center text-gray-500 mb-3">
          <UserIcon className="h-4 w-4 mr-2" />
          <span className="text-sm">Organized by {conf.organizer}</span>
        </div>
        <p className="text-gray-600 mb-4 line-clamp-3">
          {conf.description}
        </p>
        <div className="flex flex-wrap gap-1 mt-auto mb-2">
          {conf.topics?.slice(0, 3).map((topic, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {topic}
            </Badge>
          ))}
          {conf.topics && conf.topics.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{conf.topics.length - 3} more
            </Badge>
          )}
        </div>
        {conf.website && (
          <a
            href={conf.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs hover:underline block mb-1"
          >
            Website
          </a>
        )}
        {conf.contact && (
          <div className="text-xs text-gray-500">Contact: {conf.contact}</div>
        )}
      </CardContent>
      <CardFooter className="px-6 py-4 bg-gray-50 flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/attendee/conferences/${conf.id}`)}
        >
          View Details
        </Button>
        {showRegister && (
          <Button onClick={handleRegister}>
            Register
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ConferenceCard;