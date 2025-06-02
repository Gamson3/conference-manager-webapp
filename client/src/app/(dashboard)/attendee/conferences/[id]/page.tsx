"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  CheckIcon,
  InfoIcon,
  CalendarDaysIcon,
  UsersIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Speaker {
  id: number;
  name: string;
  title: string;
  bio: string;
  profilePicture?: string;
  topics?: string[];
}

interface Session {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  speakers: number[];
}

interface ScheduleDay {
  date: string;
  sessions: Session[];
}

interface Conference {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizer: string;
  website?: string;
  contact?: string;
  language?: string;
  topics?: string[];
  learningOutcomes?: string[];
  bannerImage?: string;
  schedule?: ScheduleDay[];
  speakers?: Speaker[];
}

export default function ConferenceDetails() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params?.id as string;

  const [conference, setConference] = useState<Conference | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchConferenceDetails = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();

        // Fetch conference details
        const response = await api.get(`/conferences/${conferenceId}`);
        setConference(response.data);

        // Check if user is registered
        const registrationResponse = await api.get(
          `/attendee/check-registration/${conferenceId}`
        );
        setIsRegistered(registrationResponse.data.isRegistered);
      } catch (error: any) {
        console.error("Error fetching conference details:", error);
        setError(
          error.response?.data?.message || "Failed to load conference details"
        );
        toast.error("Couldn't load conference information");
      } finally {
        setIsLoading(false);
      }
    };

    if (conferenceId) {
      fetchConferenceDetails();
    }
  }, [conferenceId]);

  const handleRegister = async () => {
    try {
      const api = await createAuthenticatedApi();
      await api.post("/attendee/register-conference", { conferenceId });
      setIsRegistered(true);
      toast.success("Successfully registered for the conference");
    } catch (error: any) {
      console.error("Error registering for conference:", error);
      toast.error(
        error.response?.data?.message || "Failed to register for conference"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Skeleton className="h-8 w-36 mb-8" />
        <Skeleton className="h-56 w-full rounded-lg mb-8" />
        <div className="mb-8">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <div className="space-y-2 mb-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-56" />
          </div>
        </div>
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !conference) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold text-red-600 mb-4">
          {error || "Conference not found"}
        </h2>
        <Button onClick={() => router.push("/attendee/discover")}>
          Discover Conferences
        </Button>
      </div>
    );
  }

  const isEventActive =
    new Date() >= new Date(conference.startDate) &&
    new Date() <= new Date(conference.endDate);
  const isEventPast = new Date() > new Date(conference.endDate);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-8 pl-0 flex items-center text-gray-600 hover:text-gray-900"
        onClick={() => router.push("/attendee/discover")}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Conferences
      </Button>

      {/* Conference Banner */}
      <div className="mb-8 p-8 rounded-lg bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {conference.title}
              </h1>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  <p>
                    {new Date(conference.startDate).toLocaleDateString()} -{" "}
                    {new Date(conference.endDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  <p>{conference.location}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {conference.topics?.map((topic, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-white/20 hover:bg-white/30 text-white border-white"
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {isRegistered ? (
                <Button
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white/20"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Registered
                </Button>
              ) : (
                <Button
                  className="bg-white text-primary-700 hover:bg-white/90"
                  onClick={handleRegister}
                >
                  Register Now
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full mb-8"
        >
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center">
              <InfoIcon className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="speakers" className="flex items-center">
              <UsersIcon className="h-4 w-4 mr-2" />
              Speakers
            </TabsTrigger>
            <TabsTrigger value="tree" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Tree View
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      About This Conference
                    </h2>

                    <p className="text-gray-700 whitespace-pre-line mb-6">
                      {conference.description}
                    </p>

                    {conference.learningOutcomes && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">
                          What You'll Learn
                        </h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {conference.learningOutcomes.map((outcome, i) => (
                            <li key={i} className="text-gray-700">
                              {outcome}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">
                      Conference Details
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Organizer</p>
                      <p className="font-medium">{conference.organizer}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">
                        {Math.ceil(
                          (new Date(conference.endDate).getTime() -
                            new Date(conference.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Language</p>
                      <p className="font-medium">
                        {conference.language || "English"}
                      </p>
                    </div>

                    {conference.website && (
                      <div>
                        <p className="text-sm text-gray-500">Website</p>
                        <a
                          href={conference.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                        >
                          Visit Website
                          <ExternalLinkIcon className="h-4 w-4 ml-1" />
                        </a>
                      </div>
                    )}

                    {conference.contact && (
                      <div>
                        <p className="text-sm text-gray-500">Contact</p>
                        <p className="font-medium">{conference.contact}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            {conference.schedule && conference.schedule.length > 0 ? (
              <div>
                {conference.schedule.map((day, dayIndex) => (
                  <div key={dayIndex} className="mb-8">
                    <h3 className="mb-4 bg-primary-50 p-3 rounded-md font-medium">
                      Day {dayIndex + 1}:{" "}
                      {new Date(day.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>

                    {day.sessions.map((session, sessionIndex) => (
                      <motion.div
                        key={sessionIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: sessionIndex * 0.05,
                        }}
                      >
                        <Card className="mb-4">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row justify-between">
                              <div>
                                <h4 className="text-lg font-semibold mb-2">
                                  {session.title}
                                </h4>

                                <p className="text-gray-600 mb-3">
                                  {session.description}
                                </p>

                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <ClockIcon className="h-4 w-4 mr-1" />
                                    {session.startTime} - {session.endTime}
                                  </div>

                                  <div className="flex items-center">
                                    <MapPinIcon className="h-4 w-4 mr-1" />
                                    {session.location}
                                  </div>

                                  {conference.speakers && (
                                    <div className="flex items-center">
                                      <UserIcon className="h-4 w-4 mr-1" />
                                      {session.speakers
                                        .map((speakerId) => {
                                          const speaker =
                                            conference.speakers?.find(
                                              (s) => s.id === speakerId
                                            );
                                          return speaker
                                            ? speaker.name
                                            : "Unknown Speaker";
                                        })
                                        .join(", ")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center py-12">
                  <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    No sessions available
                  </h3>
                  <p className="text-gray-500">
                    Sessions for this conference have not been scheduled yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Speakers Tab */}
          <TabsContent value="speakers">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conference.speakers && conference.speakers.length > 0 ? (
                conference.speakers.map((speaker, index) => (
                  <motion.div
                    key={speaker.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="h-full flex flex-col">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center mb-4">
                          <Avatar className="h-24 w-24 mb-4">
                            <AvatarImage
                              src={
                                speaker.profilePicture ||
                                "/placeholder-avatar.png"
                              }
                              alt={speaker.name}
                            />
                            <AvatarFallback>
                              {speaker.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <h3 className="text-lg font-semibold text-center">
                            {speaker.name}
                          </h3>

                          <p className="text-gray-500 text-center">
                            {speaker.title}
                          </p>
                        </div>

                        <Separator className="my-4" />

                        <p className="text-gray-600">{speaker.bio}</p>

                        {speaker.topics && speaker.topics.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-2">
                              Topics:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {speaker.topics.map((topic, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="bg-gray-100"
                                >
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
                  <UsersIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    No speakers information available
                  </h3>
                  <p className="text-gray-500">
                    Speaker information for this conference has not been added
                    yet.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tree">
            <ConferenceTreeView
              conferenceId={conference.id}
              showSearch={true}
              expandedByDefault={false}
              onPresentationSelect={(presentation) => {
                router.push(`/attendee/presentations/${presentation.id}`);
              }}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
