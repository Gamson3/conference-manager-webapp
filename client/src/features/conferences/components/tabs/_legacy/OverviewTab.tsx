'use client';

import { Calendar, MapPin, Globe, Clock, Users, FileText, ExternalLink, Award, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SafeMarkdown from '@/components/shared/SafeMarkdown';

export interface ConferenceOverviewData {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  venue?: string;
  timezone?: string;
  websiteUrl?: string;
  bannerImageUrl?: string;
  topics?: string[];
  submissionsOpenFrom?: string;
  submissionsOpenUntil?: string;
  registrationOpenFrom?: string;
  registrationOpenUntil?: string;
  isSubmissionOpen?: boolean;
  isRegistrationOpen?: boolean;
  requirementsPublic?: {
    maxFileSizeMB?: number | null;
    allowedFileTypes?: string[];
  } | null;
  submissionPortalUrl?: string | null;
  websiteContentBlocks?: {
    id: number;
    title?: string | null;
    markdown: string;
    order: number;
    updatedAt?: string;
  }[];
}

interface OverviewTabProps {
  conference: ConferenceOverviewData;
  onRegister?: () => void;
  onSubmit?: () => void;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startStr = start.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  const endStr = end.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  
  return `${startStr} - ${endStr}`;
}

function DateWindow({ label, from, until, isOpen }: { 
  label: string; 
  from?: string; 
  until?: string;
  isOpen?: boolean;
}) {
  if (!from || !until) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Badge variant="outline" className="text-xs">Not announced</Badge>
      </div>
    );
  }

  const fromDate = new Date(from);
  const untilDate = new Date(until);
  const now = new Date();
  
  const isPast = untilDate < now;
  const isUpcoming = fromDate > now;

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gradient-to-r from-muted/50 to-transparent hover:from-muted/80 transition-colors">
      <div className="flex-1">
        <span className="text-sm font-medium block">{label}</span>
        <span className="text-xs text-muted-foreground">
          {fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {untilDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      {isOpen && (
        <Badge className="bg-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Open Now
        </Badge>
      )}
      {isPast && !isOpen && (
        <Badge variant="secondary" className="text-xs">Closed</Badge>
      )}
      {isUpcoming && (
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Coming Soon
        </Badge>
      )}
    </div>
  );
}

export function OverviewTab({ conference, onRegister, onSubmit }: OverviewTabProps) {
  const conf = conference;
  const now = new Date();
  const eventDate = new Date(conf.startDate);
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const hasCfpBlocks = (conf.websiteContentBlocks?.length ?? 0) > 0;
  
  return (
    <div className="space-y-6">
      {/* Urgency Alert */}
      {daysUntil > 0 && daysUntil <= 30 && (
        <Alert className="border-l-4 border-l-blue-500 bg-blue-50/50">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong className="text-blue-900">Event starting soon!</strong>
            <span className="text-blue-800"> Only {daysUntil} days until the conference begins.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Main content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {conf.description && (
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  About This Conference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {conf.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Topics */}
          {conf.topics && conf.topics.length > 0 && (
            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                  Topics & Themes
                  <Badge variant="secondary" className="ml-auto">{conf.topics.length} tracks</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {conf.topics.map((topic, idx) => {
                    const colors = [
                      'bg-blue-100 text-blue-700 hover:bg-blue-200',
                      'bg-purple-100 text-purple-700 hover:bg-purple-200',
                      'bg-green-100 text-green-700 hover:bg-green-200',
                      'bg-orange-100 text-orange-700 hover:bg-orange-200',
                      'bg-pink-100 text-pink-700 hover:bg-pink-200',
                      'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
                    ];
                    return (
                      <Badge 
                        key={topic} 
                        variant="secondary" 
                        className={`px-3 py-1.5 font-medium transition-colors ${colors[idx % colors.length]}`}
                      >
                        {topic}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CFP Content Blocks */}
          {hasCfpBlocks && (
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  Call for Papers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {conf.submissionPortalUrl?.trim() && (
                  <div>
                    <a
                      href={conf.submissionPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Open submission portal
                    </a>
                  </div>
                )}
                {conf.websiteContentBlocks!.map((block) => (
                  <div key={block.id} className="space-y-2">
                    {block.title?.trim() && (
                      <h4 className="font-semibold text-sm">{block.title}</h4>
                    )}
                    <SafeMarkdown
                      content={block.markdown}
                      className="prose prose-sm max-w-none text-foreground [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:ml-4 [&>ol]:ml-4"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Sidebar (1/3 width) */}
        <div className="space-y-4">
          {/* Event Details */}
          <Card className="sticky top-24 shadow-lg border-2">
            <CardHeader className="pb-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-t-lg">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Conference Dates */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors">
                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Conference Dates</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateRange(conf.startDate, conf.endDate)}
                  </p>
                  {daysUntil > 0 && (
                    <p className="text-xs text-blue-600 font-medium mt-1">
                      {daysUntil} days away
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              {(conf.location || conf.venue) && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors">
                  <div className="p-2 bg-green-100 rounded-lg shrink-0">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {conf.venue && <span className="block">{conf.venue}</span>}
                      {conf.location && <span className="block">{conf.location}</span>}
                    </p>
                  </div>
                </div>
              )}

              {/* Timezone */}
              {conf.timezone && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50/50 hover:bg-orange-50 transition-colors">
                  <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Timezone</p>
                    <p className="text-sm text-muted-foreground">{conf.timezone}</p>
                  </div>
                </div>
              )}

              {/* Website */}
              {conf.websiteUrl && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50/50 hover:bg-purple-50 transition-colors">
                  <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                    <Globe className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Official Website</p>
                    <a
                      href={conf.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      Visit website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-t-lg">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <DateWindow
                label="Call for Papers"
                from={conf.submissionsOpenFrom}
                until={conf.submissionsOpenUntil}
                isOpen={conf.isSubmissionOpen}
              />
              <DateWindow
                label="Registration"
                from={conf.registrationOpenFrom}
                until={conf.registrationOpenUntil}
                isOpen={conf.isRegistrationOpen}
              />
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="space-y-2">
            {conf.isRegistrationOpen && (
              <Button 
                className="w-full shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                size="lg" 
                onClick={onRegister}
              >
                <Users className="h-4 w-4 mr-2" />
                Register Now
              </Button>
            )}
            {conf.isSubmissionOpen && (
              <Button 
                variant={conf.isRegistrationOpen ? 'outline' : 'default'} 
                className={`w-full shadow-md hover:shadow-lg transition-shadow ${!conf.isRegistrationOpen ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : ''}`}
                size="lg"
                onClick={onSubmit}
              >
                <FileText className="h-4 w-4 mr-2" />
                Submit Paper
              </Button>
            )}
          </div>

          {/* File Requirements */}
          {(conf.requirementsPublic?.maxFileSizeMB || 
            (conf.requirementsPublic?.allowedFileTypes?.length ?? 0) > 0) && (
            <Card className="shadow-md border-l-4 border-l-cyan-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  File Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {conf.requirementsPublic?.maxFileSizeMB && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">
                        Max file size: <strong className="text-foreground">{conf.requirementsPublic.maxFileSizeMB} MB</strong>
                      </span>
                    </li>
                  )}
                  {conf.requirementsPublic?.allowedFileTypes && 
                    conf.requirementsPublic.allowedFileTypes.length > 0 && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">
                        Allowed: <strong className="text-foreground">{conf.requirementsPublic.allowedFileTypes.join(', ')}</strong>
                      </span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}