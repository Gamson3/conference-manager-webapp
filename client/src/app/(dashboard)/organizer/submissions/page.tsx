"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar,
  Clock,
  ExternalLink
} from "lucide-react";
import { useGetAuthUserQuery, useGetOrganizerEventsQuery } from "@/state/api";
import { format } from "date-fns";

const SubmissionsReviewPage = () => {
  const { data: authUser, isLoading: userLoading } = useGetAuthUserQuery();
  
  const { data: conferences, isLoading: conferencesLoading } = useGetOrganizerEventsQuery(
    { organizerId: authUser?.userInfo?.id },
    { skip: !authUser?.userInfo?.id }
  );

  // Get conferences with pending submissions
  const conferencesWithPendingReviews = React.useMemo(() => {
    if (!conferences) return [];
    
    return conferences.filter(conference => 
      conference.pendingReviewsCount && conference.pendingReviewsCount > 0
    ).sort((a, b) => {
      // Sort by active status first, then by pending review count
      const aIsActive = new Date(a.startDate) <= new Date() && new Date(a.endDate) >= new Date();
      const bIsActive = new Date(b.startDate) <= new Date() && new Date(b.endDate) >= new Date();
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      
      return (b.pendingReviewsCount || 0) - (a.pendingReviewsCount || 0);
    });
  }, [conferences]);

  if (userLoading || conferencesLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Pending Submissions Review
          </h1>
          <p className="text-gray-600 mt-1">
            Manage submissions that need your review
          </p>
        </div>
      </div>

      {conferencesWithPendingReviews.length > 0 ? (
        <div className="space-y-6">
          {conferencesWithPendingReviews.map((conference) => (
            <Card key={conference.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>{conference.name}</CardTitle>
                  <Badge className="bg-amber-500">
                    {conference.pendingReviewsCount} Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(conference.startDate), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {conference.status}
                  </div>
                </div>
                
                <Link href={`/organizer/events/${conference.id}/submissions`}>
                  <Button className="w-full sm:w-auto">
                    <FileText className="h-4 w-4 mr-2" />
                    View Submissions
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-50">
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No Pending Reviews</h3>
            <p className="text-gray-500 mb-6">
               Your conferences with submissions pending review will appear here.
            </p>
            <Link href="/organizer/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubmissionsReviewPage;