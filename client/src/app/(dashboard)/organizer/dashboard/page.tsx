"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, LayoutDashboard } from "lucide-react";

const dashboardLinks = [
  {
    title: "Create a New Event",
    description: "Start organizing a new conference or event.",
    href: "/organizer/create-event",
    icon: <FileText className="h-8 w-8 text-primary-700 mb-2" />,
    button: "Create Event",
  },
  {
    title: "Manage Events",
    description: "View and manage your existing events.",
    href: "/organizer/events",
    icon: <LayoutDashboard className="h-8 w-8 text-primary-700 mb-2" />,
    button: "Manage Events",
  },
  {
    title: "Invite Users",
    description: "Invite attendees or co-organizers to your events.",
    href: "/organizer/users",
    icon: <Users className="h-8 w-8 text-primary-700 mb-2" />,
    button: "Invite Users",
  },
];

const OrganizerDashboard = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-primary-800">Organizer Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {dashboardLinks.map((item) => (
          <Link key={item.href} href={item.href} className="group" tabIndex={0}>
            <Card className="transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1 cursor-pointer h-full">
              <CardHeader className="flex flex-col items-center">
                {item.icon}
                <CardTitle className="text-lg text-center">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <p className="mb-6 text-center text-gray-600">{item.description}</p>
                <Button
                  className="bg-primary-700 text-white hover:bg-primary-800 w-full cursor-pointer"
                  variant="secondary"
                  tabIndex={-1}
                >
                  {item.button}
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default OrganizerDashboard;