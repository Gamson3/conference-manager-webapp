"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Globe, 
  FileText, 
  Download, 
  Eye, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { getConferenceById } from "@/features/conferences/api/conferencesApi";

interface ConferenceStatus {
  name: string;
  slug: string;
  isPublic: boolean;
  hasDescription: boolean;
  hasVenue: boolean;
  cfpBlockCount: number;
  materialsCount: number;
}

export default function WebsiteOverviewPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);
  const [status, setStatus] = useState<ConferenceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const conf = await getConferenceById(conferenceId);
        const cfpRes = await apiClient.get(API_ENDPOINTS.ORGANIZER.CFP(conferenceId));
        const materialsRes = await apiClient.get(API_ENDPOINTS.ORGANIZER.MATERIALS(conferenceId));
        
        setStatus({
          name: conf.name,
          slug: conf.slug || "",
          isPublic: conf.isPublic || false,
          hasDescription: !!conf.description?.trim(),
          hasVenue: !!conf.venue?.trim(),
          cfpBlockCount: cfpRes.data.blocks?.length || 0,
          materialsCount: materialsRes.data?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching website status:", error);
      } finally {
        setLoading(false);
      }
    };

    if (conferenceId) fetchStatus();
  }, [conferenceId]);

  const sections = [
    {
      id: "public",
      title: "Public Page",
      description: "Conference info, venue, and organizer details",
      icon: Globe,
      href: `/organizer/conferences/${conferenceId}/website/public`,
      status: status?.hasDescription && status?.hasVenue ? "complete" : status?.hasDescription || status?.hasVenue ? "incomplete" : "empty",
      statusText: status?.hasDescription && status?.hasVenue ? "Complete" : status?.hasDescription || status?.hasVenue ? "Incomplete" : "Empty",
    },
    {
      id: "cfp",
      title: "Call for Papers",
      description: "Submission guidelines and author content",
      icon: FileText,
      href: `/organizer/conferences/${conferenceId}/website/cfp`,
      status: (status?.cfpBlockCount ?? 0) > 0 ? "complete" : "empty",
      statusText: (status?.cfpBlockCount ?? 0) > 0 ? `${status?.cfpBlockCount} blocks` : "Empty",
    },
    {
      id: "materials",
      title: "Materials",
      description: "Downloadable files for attendees",
      icon: Download,
      href: `/organizer/conferences/${conferenceId}/website/materials`,
      status: (status?.materialsCount ?? 0) > 0 ? "complete" : "empty",
      statusText: (status?.materialsCount ?? 0) > 0 ? `${status?.materialsCount} files` : "Empty",
    },
    {
      id: "visibility",
      title: "Visibility",
      description: "Publishing and access controls",
      icon: Eye,
      href: `/organizer/conferences/${conferenceId}/website/visibility`,
      status: status?.isPublic ? "published" : "draft",
      statusText: status?.isPublic ? "Published" : "Private",
    },
  ];

  // Check if there are any actionable warnings
  const hasWarnings = status && (!status.isPublic || status.cfpBlockCount === 0);
  const isComplete = status?.hasDescription && status?.hasVenue && status?.cfpBlockCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Website</h1>
          <p className="text-muted-foreground mt-1">
            {"Build and manage your conference's public presence"}
          </p>
        </div>
        {status?.isPublic && status?.slug && (
          <Button asChild>
            <a 
              href={`/conferences/${status.slug}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Page
            </a>
          </Button>
        )}
      </div>

      {/* Compact Status Bar (only if there's useful info to show) */}
      {!loading && status && (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={status.isPublic ? "default" : "secondary"}>
                {status.isPublic ? (
                  <><Eye className="h-3 w-3 mr-1" /> Published</>
                ) : (
                  <><Eye className="h-3 w-3 mr-1 opacity-50" /> Draft</>
                )}
              </Badge>
              {isComplete && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {status.name}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <>Hide details <ChevronUp className="h-4 w-4 ml-1" /></>
            ) : (
              <>Show details <ChevronDown className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>
      )}

      {/* Expandable Details */}
      {showDetails && status && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sections.map((section) => (
                <div key={section.id} className="flex items-start gap-2 p-2 rounded border">
                  <section.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{section.title}</p>
                    <p className="text-xs text-muted-foreground">{section.statusText}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Alerts Only */}
      {!loading && hasWarnings && (
        <>
          {status && !status.isPublic && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {"Your conference page is "} <strong>private</strong>. {"Publish it when you're ready."}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={sections[3].href}>
                    Go to Visibility →
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {status && status.cfpBlockCount === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {"No Call for Papers content yet. Add it if you're accepting submissions."}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={sections[1].href}>
                    Add CFP →
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Section Cards - Clean & Focused */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.id} href={section.href}>
            <Card className="h-full hover:bg-muted/30 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription className="text-sm">
                  {section.description}
                </CardDescription>
              </CardHeader>
              
              {/* Show status badge only if loaded */}
              {!loading && status && (
                <CardContent className="pt-0">
                  <Badge 
                    variant={
                      section.status === "complete" || section.status === "published" 
                        ? "default" 
                        : "outline"
                    } 
                    className="text-xs"
                  >
                    {section.status === "complete" && (
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    )}
                    {section.statusText}
                  </Badge>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {/* Help section - Collapsible */}
      {!loading && !isComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to build your conference page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  1
                </div>
                <span className="text-muted-foreground">
                  Add conference description and venue in <strong>Public Page</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  2
                </div>
                <span className="text-muted-foreground">
                  Create submission guidelines in <strong>Call for Papers</strong> (if accepting papers)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  3
                </div>
                <span className="text-muted-foreground">
                  Publish your conference in <strong>Visibility</strong> settings
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
