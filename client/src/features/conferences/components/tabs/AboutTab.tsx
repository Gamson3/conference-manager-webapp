// ============================================================================
// ABOUT TAB - Consolidated Overview with Smart Collapsible Sections
// ============================================================================
'use client';

import { useState } from 'react';
import { 
  Calendar, MapPin, Globe, Clock, Download,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import SafeMarkdown from '@/components/shared/SafeMarkdown';

export interface ConferenceAboutData {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  venue?: string;
  venueDetails?: string;
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
  milestones?: {
    id: number;
    name: string;
    date: string;
    description?: string | null;
    type?: string | null;
  }[];
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
  travelInfo?: string;
  mapUrl?: string;
}

interface AboutTabProps {
  conference: ConferenceAboutData;
  onRegister?: () => void;
  onSubmit?: () => void;
  onDownloadInfo?: () => void;
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

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

type TimelineEntry = {
  key: string;
  label: string;
  start?: string;
  end?: string;
  note?: string;
  status?: 'open' | 'upcoming' | 'closed';
};

function formatTimelineDateBadge(entry: TimelineEntry): string {
  const { start, end } = entry;
  if (!start && !end) return 'Not announced';

  const startDate = start ? new Date(start) : undefined;
  const endDate = end ? new Date(end) : undefined;
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

  if (startDate && endDate) {
    const sameDay = startDate.toDateString() === endDate.toDateString();
    if (sameDay) return startDate.toLocaleDateString('en-US', opts);
    return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
  }

  const only = (startDate || endDate)!;
  return only.toLocaleDateString('en-US', opts);
}

function deriveStatus(start?: string, end?: string): TimelineEntry['status'] {
  if (!start && !end) return undefined;
  const now = new Date();
  const startDate = start ? new Date(start) : undefined;
  const endDate = end ? new Date(end) : undefined;

  if (startDate && now < startDate) return 'upcoming';
  if (endDate && now > endDate) return 'closed';
  if (startDate && endDate && now >= startDate && now <= endDate) return 'open';
  return undefined;
}

function sortKeyForTimeline(entry: TimelineEntry): number {
  const candidate = entry.start || entry.end;
  const date = candidate ? new Date(candidate).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(date) ? date : Number.POSITIVE_INFINITY;
}

export function AboutTab({ 
  conference, 
  onRegister, 
  onSubmit,
  onDownloadInfo 
}: AboutTabProps) {
  const conf = conference;
  const [_activeSection, _setActiveSection] = useState<string | null>('details');
  
  // Smart expansion logic
  const daysUntilSubmission = conf.submissionsOpenUntil ? getDaysUntil(conf.submissionsOpenUntil) : null;
  const daysUntilRegistration = conf.registrationOpenUntil ? getDaysUntil(conf.registrationOpenUntil) : null;
  const shouldExpandDates = (daysUntilSubmission !== null && daysUntilSubmission <= 30 && daysUntilSubmission > 0) || 
                           (daysUntilRegistration !== null && daysUntilRegistration <= 30 && daysUntilRegistration > 0);

  const [sectionsOpen, setSectionsOpen] = useState({
    details: true,
    dates: shouldExpandDates || false,
    authors: conf.isSubmissionOpen || false,
    venue: false,
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Check if authors section should be shown
  const hasCfpBlocks = (conf.websiteContentBlocks?.length ?? 0) > 0;
  const hasFileReqs = Boolean(conf.requirementsPublic?.maxFileSizeMB) || (conf.requirementsPublic?.allowedFileTypes?.length ?? 0) > 0;
  const showAuthorsSection = Boolean(conf.isSubmissionOpen) || hasCfpBlocks || hasFileReqs || Boolean(conf.submissionPortalUrl);

  return (
    <div className="space-y-4">
        {/* Download Button */}
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={onDownloadInfo}
            className="border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Info PDF
          </Button>
        </div>

        {/* Conference Details Section (Always Expanded) */}
        <div id="details" className="scroll-mt-24">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Conference Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              {conf.description && (
                <div>
                  <p className="text-slate-700 leading-relaxed">{conf.description}</p>
                </div>
              )}

              {/* Key Info Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Dates */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <Calendar className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">Conference Dates</p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {formatDateRange(conf.startDate, conf.endDate)}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {(conf.location || conf.venue) && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <MapPin className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">Location</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {conf.venue && <span className="block">{conf.venue}</span>}
                        {conf.location && <span className="block">{conf.location}</span>}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timezone */}
                {conf.timezone && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <Clock className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">Timezone</p>
                      <p className="text-sm text-slate-600 mt-0.5">{conf.timezone}</p>
                    </div>
                  </div>
                )}

                {/* Website */}
                {conf.websiteUrl && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <Globe className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">Official Website</p>
                      <a
                        href={conf.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-0.5"
                      >
                        Visit website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Topics */}
              {conf.topics && conf.topics.length > 0 && (
                <div>
                  <p className="font-semibold text-sm text-slate-900 mb-2">Topics & Themes</p>
                  <div className="flex flex-wrap gap-2">
                    {conf.topics.slice(0, 6).map((topic) => (
                      <Badge 
                        key={topic} 
                        variant="secondary" 
                        className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        {topic}
                      </Badge>
                    ))}
                    {conf.topics.length > 6 && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        +{conf.topics.length - 6} more
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {conf.isRegistrationOpen && (
                  <Button 
                    onClick={onRegister}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Register Now
                  </Button>
                )}
                {conf.isSubmissionOpen && (
                  <Button 
                    onClick={onSubmit}
                    variant={conf.isRegistrationOpen ? 'outline' : 'default'}
                    className={!conf.isRegistrationOpen ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-300'}
                  >
                    Submit Paper
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Important Dates Section (Smart Expansion) */}
        <div id="important-dates" className="scroll-mt-24">
          <Collapsible open={sectionsOpen.dates} onOpenChange={() => toggleSection('dates')}>
            <Card className="border border-slate-200 shadow-sm">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Important Dates</CardTitle>
                    {sectionsOpen.dates ? (
                      <ChevronUp className="h-5 w-5 text-slate-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  {([
                    {
                        key: 'cfp',
                        label: 'Call for Papers',
                        start: conf.submissionsOpenFrom,
                        end: conf.submissionsOpenUntil,
                        status: deriveStatus(conf.submissionsOpenFrom, conf.submissionsOpenUntil),
                      },
                      {
                        key: 'registration',
                        label: 'Registration',
                        start: conf.registrationOpenFrom,
                        end: conf.registrationOpenUntil,
                        status: deriveStatus(conf.registrationOpenFrom, conf.registrationOpenUntil),
                      },
                      {
                        key: 'conference',
                        label: 'Conference',
                        start: conf.startDate,
                        end: conf.endDate,
                      },
                      ...(conf.milestones || []).map((m) => ({
                        key: `milestone-${m.id}`,
                        label: m.name,
                        start: m.date,
                        end: m.date,
                        note: m.description || undefined,
                        status: deriveStatus(m.date, m.date),
                      })),
                  ] as TimelineEntry[])
                    .sort((a, b) => sortKeyForTimeline(a) - sortKeyForTimeline(b))
                    .map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {formatTimelineDateBadge(entry)}
                          </Badge>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">{entry.label}</span>
                              {entry.status === 'open' && (
                                <Badge className="bg-green-600 text-white text-xs">Open</Badge>
                              )}
                              {entry.status === 'upcoming' && (
                                <Badge variant="secondary" className="text-xs">Upcoming</Badge>
                              )}
                              {entry.status === 'closed' && (
                                <Badge variant="secondary" className="text-xs">Closed</Badge>
                              )}
                            </div>
                            {entry.note && (
                              <p className="text-xs text-slate-600">{entry.note}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Back-compat: if none of the above had dates */}
                  {!conf.submissionsOpenFrom &&
                    !conf.submissionsOpenUntil &&
                    !conf.registrationOpenFrom &&
                    !conf.registrationOpenUntil &&
                    (!conf.milestones || conf.milestones.length === 0) && (
                      <div className="text-sm text-slate-600">
                        Dates will appear here once announced.
                      </div>
                    )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* For Authors Section (Conditional + Smart Expansion) */}
        {showAuthorsSection && (
          <div id="for-authors" className="scroll-mt-24">
            <Collapsible open={sectionsOpen.authors} onOpenChange={() => toggleSection('authors')}>
              <Card className="border border-slate-200 shadow-sm">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">For Authors</CardTitle>
                        {conf.isSubmissionOpen && (
                          <Badge className="bg-green-600 text-white text-xs">Open</Badge>
                        )}
                      </div>
                      {sectionsOpen.authors ? (
                        <ChevronUp className="h-5 w-5 text-slate-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Submission Portal */}
                    {conf.submissionPortalUrl?.trim() && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="font-semibold text-sm text-slate-900 mb-1">Submission Portal</h4>
                        <a
                          href={conf.submissionPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Open submission portal
                        </a>
                      </div>
                    )}

                    {/* CFP Content Blocks */}
                    {hasCfpBlocks && (
                      <div className="space-y-4">
                        {conf.websiteContentBlocks!.map((block) => (
                          <div key={block.id} className="space-y-2">
                            {block.title?.trim() && (
                              <h4 className="font-semibold text-sm text-slate-900">{block.title}</h4>
                            )}
                            <SafeMarkdown
                              content={block.markdown}
                              className="prose prose-sm max-w-none text-slate-700"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* File Requirements */}
                    {(conf.requirementsPublic?.maxFileSizeMB || 
                      (conf.requirementsPublic?.allowedFileTypes?.length ?? 0) > 0) && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="font-semibold text-sm text-slate-900 mb-2">
                          File Requirements
                        </h4>
                        <ul className="text-sm space-y-1 text-slate-700">
                          {conf.requirementsPublic?.maxFileSizeMB && (
                            <li>• Max file size: {conf.requirementsPublic.maxFileSizeMB} MB</li>
                          )}
                          {conf.requirementsPublic?.allowedFileTypes && 
                            conf.requirementsPublic.allowedFileTypes.length > 0 && (
                            <li>• Allowed: {conf.requirementsPublic.allowedFileTypes.join(', ')}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        )}
    </div>
  );
}
