"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Image, { type ImageLoader } from "next/image";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnsavedChangesBar from "@/components/shared/UnsavedChangesBar";
import SafeMarkdown from "@/components/shared/SafeMarkdown";
import { toast } from "sonner";
import { 
  Globe, 
  Building2, 
  User, 
  Image as ImageIcon, 
  ExternalLink, 
  ChevronRight, 
  Calendar,
  MapPin,
  Mail,
  Phone,
  Link2
} from "lucide-react";

const passthroughImageLoader: ImageLoader = ({ src }) => src;

interface PublicPageContent {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  venue: string | null;
  venueAddress: string | null;
  startDate: string | null;
  endDate: string | null;
  timezone: string | null;
  bannerImageUrl: string | null;
  websiteUrl: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  organizerPhone: string | null;
  organizerWebsite: string | null;
  organizerLogoUrl: string | null;
  organizerNotes: string | null;
  isPublic: boolean;
  status: string;
}

interface FormValues {
  description: string;
  location: string;
  venue: string;
  venueAddress: string;
  bannerImageUrl: string;
  websiteUrl: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerWebsite: string;
  organizerLogoUrl: string;
  organizerNotes: string;
}

export default function PublicPageEditor() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [content, setContent] = useState<PublicPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formValues, setFormValues] = useState<FormValues>({
    description: "",
    location: "",
    venue: "",
    venueAddress: "",
    bannerImageUrl: "",
    websiteUrl: "",
    organizerName: "",
    organizerEmail: "",
    organizerPhone: "",
    organizerWebsite: "",
    organizerLogoUrl: "",
    organizerNotes: "",
  });

  const [initialSnapshot, setInitialSnapshot] = useState<FormValues>({
    description: "",
    location: "",
    venue: "",
    venueAddress: "",
    bannerImageUrl: "",
    websiteUrl: "",
    organizerName: "",
    organizerEmail: "",
    organizerPhone: "",
    organizerWebsite: "",
    organizerLogoUrl: "",
    organizerNotes: "",
  });

  const fetchContent = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.PUBLIC_PAGE(conferenceId));
      setContent(res.data);
      const snapshot = {
        description: res.data.description || "",
        location: res.data.location || "",
        venue: res.data.venue || "",
        venueAddress: res.data.venueAddress || "",
        bannerImageUrl: res.data.bannerImageUrl || "",
        websiteUrl: res.data.websiteUrl || "",
        organizerName: res.data.organizerName || "",
        organizerEmail: res.data.organizerEmail || "",
        organizerPhone: res.data.organizerPhone || "",
        organizerWebsite: res.data.organizerWebsite || "",
        organizerLogoUrl: res.data.organizerLogoUrl || "",
        organizerNotes: res.data.organizerNotes || "",
      };
      setFormValues(snapshot);
      setInitialSnapshot(snapshot);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleChange = useCallback((field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(initialSnapshot),
    [formValues, initialSnapshot]
  );

  const undoAll = useCallback(() => setFormValues(initialSnapshot), [initialSnapshot]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put(API_ENDPOINTS.ORGANIZER.PUBLIC_PAGE(conferenceId), formValues);
      setContent(res.data);
      const newSnapshot = {
        description: res.data.description || "",
        location: res.data.location || "",
        venue: res.data.venue || "",
        venueAddress: res.data.venueAddress || "",
        bannerImageUrl: res.data.bannerImageUrl || "",
        websiteUrl: res.data.websiteUrl || "",
        organizerName: res.data.organizerName || "",
        organizerEmail: res.data.organizerEmail || "",
        organizerPhone: res.data.organizerPhone || "",
        organizerWebsite: res.data.organizerWebsite || "",
        organizerLogoUrl: res.data.organizerLogoUrl || "",
        organizerNotes: res.data.organizerNotes || "",
      };
      setFormValues(newSnapshot);
      setInitialSnapshot(newSnapshot);
      toast.success("Public page content updated");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return "Dates TBA";
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return startDate.toLocaleDateString("en-US", opts);
    }
    
    return `${startDate.toLocaleDateString("en-US", opts)} – ${endDate.toLocaleDateString("en-US", opts)}`;
  };

  if (!conferenceId) return null;
  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!content) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="../website" className="hover:text-foreground transition-colors">Website</a>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Public Page</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Public Page</h1>
          <p className="text-muted-foreground mt-1">
            {"Configure the content shown in the \"Overview\" tab of your public conference page."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {content.isPublic && content.slug && (
            <Button variant="outline" asChild>
              <a href={`/conferences/${content.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </a>
            </Button>
          )}
        </div>
      </div>


      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="venue">Venue</TabsTrigger>
          <TabsTrigger value="organizer">Organizer</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Conference Description
              </CardTitle>
              <CardDescription>
                Main description shown at the top of your conference page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                  <span className="text-xs text-muted-foreground ml-2">→ Overview tab</span>
                </Label>
                <Textarea
                  id="description"
                  value={formValues.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter a detailed description of your conference..."
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Supports markdown: **bold**, *italic*, [links](url), lists
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Visual Assets
              </CardTitle>
              <CardDescription>
                Banner image and external website link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bannerImageUrl">
                  Banner Image URL
                  <span className="text-xs text-muted-foreground ml-2">→ Hero section</span>
                </Label>
                <Input
                  id="bannerImageUrl"
                  value={formValues.bannerImageUrl}
                  onChange={(e) => handleChange("bannerImageUrl", e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended size: 1200×400px or larger
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">
                  Conference Website URL
                  <span className="text-xs text-muted-foreground ml-2">→ External link</span>
                </Label>
                <Input
                  id="websiteUrl"
                  value={formValues.websiteUrl}
                  onChange={(e) => handleChange("websiteUrl", e.target.value)}
                  placeholder="https://yourconference.com"
                />
                <p className="text-xs text-muted-foreground">
                  Link to your official conference website (if separate)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Venue Tab */}
        <TabsContent value="venue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Venue Information
              </CardTitle>
              <CardDescription>
                Location details shown in the venue section
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    City / Region
                    <span className="text-xs text-muted-foreground ml-2">→ Location badge</span>
                  </Label>
                  <Input
                    id="location"
                    value={formValues.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">
                    Venue Name
                    <span className="text-xs text-muted-foreground ml-2">→ Venue heading</span>
                  </Label>
                  <Input
                    id="venue"
                    value={formValues.venue}
                    onChange={(e) => handleChange("venue", e.target.value)}
                    placeholder="Moscone Center"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueAddress">
                  Full Address
                  <span className="text-xs text-muted-foreground ml-2">→ Address details</span>
                </Label>
                <Textarea
                  id="venueAddress"
                  value={formValues.venueAddress}
                  onChange={(e) => handleChange("venueAddress", e.target.value)}
                  placeholder="747 Howard St, San Francisco, CA 94103, USA"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizer Tab */}
        <TabsContent value="organizer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Organizer Information
              </CardTitle>
              <CardDescription>
                Contact details and organization info (shown in footer)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organizerName">
                    Organization Name
                    <span className="text-xs text-muted-foreground ml-2">→ Footer</span>
                  </Label>
                  <Input
                    id="organizerName"
                    value={formValues.organizerName}
                    onChange={(e) => handleChange("organizerName", e.target.value)}
                    placeholder="Conference Organizers Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizerEmail">Contact Email</Label>
                  <Input
                    id="organizerEmail"
                    type="email"
                    value={formValues.organizerEmail}
                    onChange={(e) => handleChange("organizerEmail", e.target.value)}
                    placeholder="info@conference.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organizerPhone">Phone Number</Label>
                  <Input
                    id="organizerPhone"
                    value={formValues.organizerPhone}
                    onChange={(e) => handleChange("organizerPhone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizerWebsite">Organization Website</Label>
                  <Input
                    id="organizerWebsite"
                    value={formValues.organizerWebsite}
                    onChange={(e) => handleChange("organizerWebsite", e.target.value)}
                    placeholder="https://organizer.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizerLogoUrl">Organization Logo URL</Label>
                <Input
                  id="organizerLogoUrl"
                  value={formValues.organizerLogoUrl}
                  onChange={(e) => handleChange("organizerLogoUrl", e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Square format recommended (e.g., 200×200px)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizerNotes">Additional Notes</Label>
                <Textarea
                  id="organizerNotes"
                  value={formValues.organizerNotes}
                  onChange={(e) => handleChange("organizerNotes", e.target.value)}
                  placeholder="Any additional information for attendees..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Public Page Preview</CardTitle>
              <CardDescription>
                {"How the \"Overview\" tab will appear on your public conference page"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-background overflow-hidden">
                {/* Banner */}
                {formValues.bannerImageUrl && (
                  <div className="w-full h-64 bg-muted relative">
                    <Image
                      src={formValues.bannerImageUrl}
                      alt="Conference banner"
                      fill
                      sizes="100vw"
                      className="object-cover"
                      loader={passthroughImageLoader}
                      unoptimized
                    />
                  </div>
                )}

                <div className="p-8 space-y-8">
                  {/* Title and Metadata */}
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold">{content.name}</h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                      {(content.startDate || content.endDate) && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {formatDateRange(content.startDate, content.endDate)}
                          </span>
                        </div>
                      )}
                      {formValues.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{formValues.location}</span>
                        </div>
                      )}
                      {formValues.websiteUrl && (
                        <a 
                          href={formValues.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Link2 className="h-4 w-4" />
                          <span className="text-sm">Official Website</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {formValues.description ? (
                    <div className="prose prose-sm max-w-none">
                      <SafeMarkdown content={formValues.description} />
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      No description yet. Add a conference description above.
                    </p>
                  )}

                  {/* Venue Section */}
                  {(formValues.venue || formValues.venueAddress) && (
                    <div className="border-t pt-8 space-y-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Venue
                      </h2>
                      <div className="space-y-1">
                        {formValues.venue && (
                          <p className="font-medium">{formValues.venue}</p>
                        )}
                        {formValues.venueAddress && (
                          <p className="text-sm text-muted-foreground">
                            {formValues.venueAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Organizer Section */}
                  {formValues.organizerName && (
                    <div className="border-t pt-8 space-y-4">
                      <h2 className="text-xl font-semibold">Organized by</h2>
                      <div className="flex items-start gap-4">
                        {formValues.organizerLogoUrl && (
                          <Image
                            src={formValues.organizerLogoUrl}
                            alt="Organizer logo"
                            width={64}
                            height={64}
                            className="w-16 h-16 object-contain rounded"
                            loader={passthroughImageLoader}
                            unoptimized
                          />
                        )}
                        <div className="space-y-2">
                          <p className="font-medium">{formValues.organizerName}</p>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {formValues.organizerEmail && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5" />
                                <a href={`mailto:${formValues.organizerEmail}`} className="hover:text-foreground">
                                  {formValues.organizerEmail}
                                </a>
                              </div>
                            )}
                            {formValues.organizerPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5" />
                                <span>{formValues.organizerPhone}</span>
                              </div>
                            )}
                            {formValues.organizerWebsite && (
                              <div className="flex items-center gap-2">
                                <Link2 className="h-3.5 w-3.5" />
                                <a 
                                  href={formValues.organizerWebsite} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-foreground"
                                >
                                  {formValues.organizerWebsite}
                                </a>
                              </div>
                            )}
                          </div>
                          {formValues.organizerNotes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {formValues.organizerNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UnsavedChangesBar visible={hasChanges} saving={saving} onUndoAll={undoAll} onSave={handleSave} />
    </div>
  );
}
