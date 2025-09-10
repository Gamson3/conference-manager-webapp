import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Globe, Users, Building } from "lucide-react";

export function ConferenceInfoBox({ conference }: { conference: any }) {
  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Conference Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {conference.startDate && conference.endDate && (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {conference.startDate
                ? new Date(conference.startDate).toLocaleDateString()
                : ""}{" "}
              –{" "}
              {conference.endDate
                ? new Date(conference.endDate).toLocaleDateString()
                : ""}
            </span>
          </div>
        )}

        {conference.location && (
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{conference.location}</span>
          </div>
        )}

        {conference.organizer && (
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{conference.organizer}</span>
          </div>
        )}

        {conference.website && (
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
            <a
              href={conference.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {conference.website}
            </a>
          </div>
        )}

        <div className="flex items-center">
          <Users className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{conference._count?.attendances || 0} registered</span>
        </div>
      </CardContent>
    </Card>
  );
}
