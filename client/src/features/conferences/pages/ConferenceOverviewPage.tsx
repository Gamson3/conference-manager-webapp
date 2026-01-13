"use client";
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Loader2, AlertCircle, Calendar, MapPin, Users, LayoutGrid, Share2, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFavoritesContext } from '@/features/favorites';
import LoginForm from '@/features/auth/components/LoginForm';
import RegisterForm from '@/features/auth/components/RegisterForm';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import { AboutTab, PeopleTab, ProgramTab, type ProgramDay, type Speaker, type SessionType } from '@/features/conferences/components/tabs';
import { PresentationDetailModal, type PresentationDetailData } from '@/features/conferences/components/PresentationDetailModal';
import { toast } from 'sonner';

const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startText = start.toLocaleDateString(undefined, opts);
  const endText = end.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
  return startText === endText ? endText : `${startText} - ${endText}`;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  (value && typeof value === 'object') ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const canUseNextImage = (src: string): boolean => {
  if (src.startsWith('/')) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return false;
    return url.hostname === 'images.unsplash.com' || url.hostname.endsWith('.unsplash.com');
  } catch {
    return false;
  }
};

const safeCssBackgroundUrl = (src: string | undefined): string | undefined => {
  if (!src) return undefined;
  if (src.startsWith('/')) return src;
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

type Author = { id: string; name: string; affiliation?: string; isPresenter?: boolean };

const parseAuthors = (value: unknown): Author[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw): Author | null => {
      const a = toRecord(raw);
      // ID can be number or string from API - convert to string
      const idRaw = a.id;
      const id = typeof idRaw === 'number' ? String(idRaw) : asString(idRaw);
      const name = asString(a.name);
      if (!id || !name) return null;
      const affiliation = asString(a.affiliation);
      const isPresenter = a.isPresenter === true ? true : undefined;
      return { id, name, affiliation, isPresenter };
    })
    .filter((a): a is Author => a !== null);
};

const normalizeTab = (value: string | null): 'about' | 'program' | 'people' => {
  if (value === 'program' || value === 'people') return value;
  return 'about';
};

const parseSessionType = (value: unknown): SessionType => {
  const raw = asString(value);
  switch (raw) {
    case 'presentation':
    case 'keynote':
    case 'panel':
    case 'workshop':
    case 'break':
    case 'networking':
      return raw;
    default:
      return 'presentation';
  }
};

interface PublicRequirements {
  maxFileSizeMB?: number | null;
  allowedFileTypes?: string[];
}

interface PublicCfpBlock {
  id: number;
  title?: string | null;
  markdown: string;
  order: number;
  updatedAt?: string;
}

interface PublicMilestone {
  id: number;
  name: string;
  date: string;
  description?: string | null;
  type?: string | null;
}

interface PublicConference {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  timezone?: string;
  venue?: string;
  websiteUrl?: string;
  bannerImageUrl?: string;
  organizerLogoUrl?: string | null;
  topics?: string[];
  submissionsOpenFrom?: string;
  submissionsOpenUntil?: string;
  registrationOpenFrom?: string;
  registrationOpenUntil?: string;
  isSubmissionOpen?: boolean;
  isRegistrationOpen?: boolean;
  requirementsPublic?: PublicRequirements | null;
  milestones?: PublicMilestone[];
  submissionPortalUrl?: string | null;
  websiteContentBlocks?: PublicCfpBlock[];
}

export function ConferenceOverviewPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { toggleFavorite } = useFavoritesContext();
  const id = params?.id;
  
  // UI State
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [pendingAction, setPendingAction] = useState<'register' | 'submit' | null>(null);
  const [selectedPresentation, setSelectedPresentation] = useState<PresentationDetailData | null>(null);

  const tabsSentinelRef = useRef<HTMLDivElement | null>(null);
  const [isTabsSticky, setIsTabsSticky] = useState(false);

  const getNavbarHeightPx = (): number => {
    if (typeof window === 'undefined') return 56;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--navbar-height').trim();
    if (!raw) return 56;

    const rootFontSizePx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 56;

    if (raw.endsWith('px')) return n;
    if (raw.endsWith('rem')) return n * rootFontSizePx;

    // Fallback for unexpected units
    return 56;
  };

  // React Query: Conference data
  const { data: conf, isLoading: loading, error: confError } = useQuery({
    queryKey: ['conference', id],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.PUBLIC.CONFERENCE(id!));
      return data as PublicConference;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const error = confError ? (confError instanceof Error ? confError.message : 'Failed to load conference') : undefined;

  // React Query: Check if user is already registered for this conference
  interface RegisteredConference {
    id: number;
    name: string;
    status: string;
  }
  const { data: myConferences = [] } = useQuery({
    queryKey: ['my-conferences'],
    queryFn: async () => {
      const { data } = await apiClient.get<RegisteredConference[]>(API_ENDPOINTS.ACCOUNT.MY_CONFERENCES);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
  });

  const isUserRegistered = myConferences.some(
    (c) => c.id === conf?.id && c.status === 'registered'
  );

  // React Query: Program data
  const { data: programDays = [], isLoading: programLoading } = useQuery({
    queryKey: ['conference-program', id],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.PUBLIC.SCHEDULE(id!), {
        headers: { 'X-Suppress-403-Redirect': 'true' }
      });
      const root = toRecord(data);
      const rawDays: unknown = root.days;
      const daysArray = Array.isArray(rawDays) ? rawDays : [];

      const days: ProgramDay[] = daysArray
        .map((day) => {
          const d = toRecord(day);
          const dayIdRaw = d.id;
          const dayId =
            typeof dayIdRaw === 'number' || typeof dayIdRaw === 'string'
              ? String(dayIdRaw)
              : '';
          if (!dayId) return null;

          const rawSections = d.sections;
          const sectionsArray = Array.isArray(rawSections) ? rawSections : [];

          const sessions = sectionsArray
            .map((section) => {
              const s = toRecord(section);
              const sectionIdRaw = s.id;
              const sectionId =
                typeof sectionIdRaw === 'number' || typeof sectionIdRaw === 'string'
                  ? String(sectionIdRaw)
                  : '';
              if (!sectionId) return null;

              const rawPresentations = s.presentations;
              const presentationsArray = Array.isArray(rawPresentations) ? rawPresentations : [];

              const presentations = presentationsArray
                .map((pres) => {
                  const p = toRecord(pres);
                  const presIdRaw = p.id;
                  const presId =
                    typeof presIdRaw === 'number' || typeof presIdRaw === 'string'
                      ? String(presIdRaw)
                      : '';
                  if (!presId) return null;

                  // NOTE: File-related fields are intentionally excluded from public views.
                  // Files are only accessible to authors (own submissions) and organizers.
                  return {
                    id: presId,
                    title: asString(p.title) ?? '',
                    abstract: asString(p.abstract),
                    keywords: asStringArray(p.keywords),
                    authors: parseAuthors(p.authors),
                  };
                })
                .filter((p): p is NonNullable<typeof p> => p !== null);

              const type = parseSessionType(s.type);

              return {
                id: sectionId,
                title: asString(s.name) ?? '',
                type,
                startTime: asString(s.startTime) ?? '',
                endTime: asString(s.endTime) ?? '',
                room: asString(s.room),
                capacity: asNumber(s.capacity),
                description: asString(s.description),
                presentations,
              };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null);

          return {
            id: dayId,
            date: asString(d.date) ?? '',
            label: asString(d.name) ?? (asString(d.label) ?? ''),
            rooms: [],
            sessions,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      return days;
    },
    enabled: !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // React Query: Speakers data
  const { data: speakers = [], isLoading: speakersLoading } = useQuery({
    queryKey: ['conference-speakers', id, programDays.length],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.PUBLIC.SPEAKERS(id!), {
        headers: { 'X-Suppress-403-Redirect': 'true' }
      });
      const root = toRecord(data);
      const rawSpeakers = Array.isArray(data) ? data : (Array.isArray(root.speakers) ? root.speakers : []);

      const speakerBase = rawSpeakers
        .map((raw) => {
          const s = toRecord(raw);
          const rawId = s.id;
          const speakerId = typeof rawId === 'number' || typeof rawId === 'string' ? String(rawId) : undefined;
          const name = asString(s.name);
          if (!speakerId || !name) return null;
          return {
            id: speakerId,
            name,
            email: asString(s.email),
            affiliation: asString(s.affiliation),
            bio: asString(s.bio),
            photoUrl: asString(s.photoUrl),
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const enriched: Speaker[] = speakerBase.map((speaker) => {
        const presentations: Speaker['presentations'] = [];
        let isKeynote = false;

        for (const day of programDays) {
          for (const session of day.sessions ?? []) {
            for (const pres of session.presentations ?? []) {
              const matches = pres.authors?.some((author) => author.id === speaker.id);
              if (!matches) continue;

              presentations.push({
                id: String(pres.id),
                title: pres.title,
                sessionTitle: session.title,
              });

              if (session.type === 'keynote') isKeynote = true;
            }
          }
        }

        return {
          ...speaker,
          isKeynote,
          presentations,
        };
      });

      return enriched;
    },
    enabled: !!id && programDays.length > 0,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Calculate stats
  const totalPresentations = programDays.reduce((total, day) => {
    return total + (day.sessions || []).reduce((dayTotal, session) => {
      return dayTotal + (session.presentations || []).length;
    }, 0);
  }, 0);

  const totalSessions = programDays.reduce((acc, d) => acc + (d.sessions?.length ?? 0), 0);

  const stats = {
    presentations: totalPresentations,
    speakers: speakers.length,
    days: programDays.length,
    sessions: totalSessions,
  };

  type HeaderStatKey = 'days' | 'sessions' | 'talks';
  type HeaderStatItem = { key: HeaderStatKey; label: string; value: number };

  const headerStatsItems = (
    [
      { key: 'days' as const, label: 'Days', value: stats.days },
      { key: 'sessions' as const, label: 'Sessions', value: stats.sessions },
      { key: 'talks' as const, label: 'Talks', value: stats.presentations },
    ] satisfies HeaderStatItem[]
  ).filter((item) => item.value > 0);

  const headerStatsGridColsClass =
    headerStatsItems.length === 1
      ? 'grid-cols-1'
      : headerStatsItems.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-3';

  // Handlers
  const handleRegister = () => {
    if (!id) return;
    if (isAuthenticated) {
      router.push(`/conferences/${id}/register`);
    } else {
      setPendingAction('register');
      setAuthMode('login');
      setShowAuthDialog(true);
    }
  };

  const handleSubmit = () => {
    if (!id) return;
    if (isAuthenticated) {
      router.push(`/conferences/${id}/submit`);
    } else {
      setPendingAction('submit');
      setAuthMode('login');
      setShowAuthDialog(true);
    }
  };

  const handleShare = async (): Promise<void> => {
    const href = typeof window !== 'undefined' ? window.location.href : '';
    if (!href) return;
    await navigator.clipboard.writeText(href);
    toast.success('Link copied to clipboard');
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    if (pendingAction === 'register') {
      router.push(`/conferences/${id}/register`);
    } else if (pendingAction === 'submit') {
      router.push(`/conferences/${id}/submit`);
    }
    setPendingAction(null);
  };

  const handlePresentationClick = (presentationId: string): void => {
    // Find the presentation in programDays
    for (const day of programDays) {
      for (const session of day.sessions ?? []) {
        const pres = session.presentations.find((p) => p.id === presentationId);
        if (pres) {
          // NOTE: File-related fields are intentionally excluded from public views.
          const detailData: PresentationDetailData = {
            id: pres.id,
            title: pres.title,
            abstract: pres.abstract,
            keywords: pres.keywords,
            authors: pres.authors.map((a, idx) => ({
              id: a.id,
              name: a.name,
              affiliation: a.affiliation,
              isPresenter: idx === 0,
            })),
            isFavorite: false, // Could integrate with favorites context if needed
            session: {
              title: session.title,
              room: session.room,
              startTime: session.startTime,
              endTime: session.endTime,
              dayLabel: day.label,
              dayDate: day.date,
            },
          };
          setSelectedPresentation(detailData);
          return;
        }
      }
    }
  };

  const activeTab = normalizeTab(searchParams.get('tab'));

  const setTab = (tab: 'about' | 'program' | 'people'): void => {
    const url = new URL(typeof window !== 'undefined' ? window.location.href : `http://localhost/conferences/${id}`);
    url.searchParams.set('tab', tab);
    router.replace(`${url.pathname}${url.search}`);
  };

  useEffect(() => {
    let rafId: number | null = null;

    const updateSticky = (): void => {
      const sentinel = tabsSentinelRef.current;
      if (!sentinel) return;

      const navbarHeightPx = getNavbarHeightPx();
      const sentinelTop = sentinel.getBoundingClientRect().top;
      const nextIsSticky = sentinelTop <= navbarHeightPx;

      setIsTabsSticky((prev) => (prev === nextIsSticky ? prev : nextIsSticky));
    };

    const scheduleUpdate = (): void => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateSticky();
      });
    };

    // Initialize immediately on mount.
    updateSticky();

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error || !conf) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Conference Not Found</h2>
                <p className="text-muted-foreground">
                  {error || 'The conference you are looking for does not exist or is not publicly available.'}
                </p>
              </div>
              <Button onClick={() => router.push('/conferences')}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Browse Conferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const aboutData = {
    id: conf.id,
    name: conf.name,
    description: conf.description,
    startDate: conf.startDate,
    endDate: conf.endDate,
    location: conf.location,
    timezone: conf.timezone,
    venue: conf.venue,
    websiteUrl: conf.websiteUrl,
    bannerImageUrl: conf.bannerImageUrl,
    topics: conf.topics ?? [],
    submissionsOpenFrom: conf.submissionsOpenFrom,
    submissionsOpenUntil: conf.submissionsOpenUntil,
    registrationOpenFrom: conf.registrationOpenFrom,
    registrationOpenUntil: conf.registrationOpenUntil,
    isSubmissionOpen: conf.isSubmissionOpen ?? false,
    isRegistrationOpen: conf.isRegistrationOpen ?? false,
    requirementsPublic: conf.requirementsPublic ?? null,
    milestones: conf.milestones ?? [],
    submissionPortalUrl: conf.submissionPortalUrl ?? null,
    websiteContentBlocks: conf.websiteContentBlocks ?? [],
  };

  // Main render
  return (
    <>
      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'register' ? 'Register for Conference' : 'Submit Abstract'}
            </DialogTitle>
            <DialogDescription>
              Sign in or create an account to continue
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm onSuccess={handleAuthSuccess} />
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              <RegisterForm onSuccess={handleAuthSuccess} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="min-h-screen bg-muted/30">
        {/* Hero / Banner */}
        <section
          className="w-full h-[200px] bg-muted border-b bg-cover bg-center"
          style={{
            backgroundImage: (() => {
              const bg = safeCssBackgroundUrl(conf.bannerImageUrl);
              if (bg) return `url(\"${bg.replace(/\"/g, '%22').replace(/'/g, '%27')}\")`;
              return 'linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)';
            })(),
          }}
          aria-label="Conference banner"
        />

        {/* Conference Header Row */}
        <div className="bg-background border-b">
          <div className="app-container py-6">
            <Button variant="ghost" size="sm" onClick={() => router.push('/conferences')} className="gap-2 mb-4">
              <ChevronLeft className="h-4 w-4" />
              Back to conferences
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* LEFT: Event Details */}
              <div className="lg:col-span-8">
                <div className="flex gap-4">
                  {/* Logo */}
                  <div className="shrink-0">
                    <div className="relative w-[100px] h-[100px] rounded-md overflow-hidden border bg-muted">
                      {conf.organizerLogoUrl && canUseNextImage(conf.organizerLogoUrl) ? (
                        <Image
                          src={conf.organizerLogoUrl}
                          alt="Organizer logo"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Logo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {conf.isSubmissionOpen ? (
                        <Badge variant="secondary">Submissions open</Badge>
                      ) : (
                        <Badge variant="outline">Submissions closed</Badge>
                      )}
                      {conf.isRegistrationOpen ? (
                        <Badge variant="secondary">Registration open</Badge>
                      ) : (
                        <Badge variant="outline">Registration closed</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateRange(conf.startDate, conf.endDate)}</span>
                    </div>

                    <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight leading-tight line-clamp-2">
                      {conf.name}
                    </h1>

                    <div className="text-sm text-muted-foreground mt-1">
                      Conference
                    </div>

                    {(conf.venue || conf.location) ? (
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1 gap-y-1">
                        <MapPin className="h-4 w-4" />
                        <span>{conf.venue ? conf.venue : conf.location}</span>
                        {conf.venue && conf.location ? <span>• {conf.location}</span> : null}
                      </div>
                    ) : null}

                    {conf.description ? (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {conf.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* RIGHT: Actions */}
              <div className="lg:col-span-4">
                <div className="h-full flex">
                  {/* Vertical separator */}
                  <div className="hidden lg:flex flex-col items-center mr-4">
                    <span className="h-3 w-3 rounded-full border bg-background" />
                    <span className="flex-1 w-px bg-border" />
                    <span className="h-3 w-3 rounded-full border bg-background" />
                  </div>

                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-end">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => void handleShare()}>
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </div>

                    {/* <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/conferences/${id}/program`)}
                        className="gap-2"
                      >
                        <LayoutGrid className="h-4 w-4" />
                        Program
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/conferences/${id}/people`)}
                        className="gap-2"
                      >
                        <Users className="h-4 w-4" />
                        People
                      </Button>
                    </div> */}

                    <div className="grid grid-cols-2 gap-3">
                      {isUserRegistered ? (
                        <Button variant="outline" disabled className="gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Registered
                        </Button>
                      ) : (
                        <Button onClick={handleRegister} disabled={!conf.isRegistrationOpen}>
                          {conf.isRegistrationOpen ? 'Register' : 'Registration Closed'}
                        </Button>
                      )}
                      <Button variant="outline" onClick={handleSubmit} disabled={!conf.isSubmissionOpen}>
                        {conf.isSubmissionOpen ? 'Submit' : 'Submission Closed'}
                      </Button>
                    </div>

                    {/* Compact stats (replaces sidebar "At a glance") */}
                    {headerStatsItems.length > 0 ? (
                      <div className="rounded-md border bg-muted/40 p-3">
                        <div className={`grid ${headerStatsGridColsClass} gap-2`}>
                          {headerStatsItems.map((item) => (
                            <div key={item.key} className="text-center">
                              <div className="text-base font-semibold leading-tight">{item.value}</div>
                              <div className="text-xs text-muted-foreground">{item.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar (sticky) */}
        <div ref={tabsSentinelRef} className="h-px" />
        <nav
          className={
            `sticky top-[var(--navbar-height)] z-40 bg-background/95 backdrop-blur border-b transition-shadow ` +
            (isTabsSticky ? 'shadow-md' : '')
          }
          aria-label="Conference sections"
        >
          <div className="app-container">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center py-3">
              {/* LEFT: Tabs (match old TabsList width in main column) */}
              <div className="md:col-span-8">
                <div className="inline-flex w-full h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                  <div className="grid grid-cols-3 w-full gap-1">
                    <button
                      type="button"
                      onClick={() => setTab('about')}
                      className={
                        `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ` +
                        (activeTab === 'about'
                          ? 'bg-background text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground')
                      }
                    >
                      About
                    </button>

                    <button
                      type="button"
                      onClick={() => setTab('program')}
                      className={
                        `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 gap-2 ` +
                        (activeTab === 'program'
                          ? 'bg-background text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground')
                      }
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span>Program</span>
                      {/* {stats.presentations > 0 ? (
                        <Badge variant="secondary" className="h-5 px-2 text-xs">
                          {stats.presentations}
                        </Badge>
                      ) : null} */}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTab('people')}
                      className={
                        `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 gap-2 ` +
                        (activeTab === 'people'
                          ? 'bg-background text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground')
                      }
                    >
                      <Users className="h-4 w-4" />
                      {speakers.length > 0 ? (
                        <Badge variant="secondary" className="bg-transparent h-5 px-0 text-sm">
                          {speakers.length}
                        </Badge>
                      ) : null}
                      <span>People</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: CTA appears only after sticking (mirrors legacy "extra-cta") */}
              <div className="md:col-span-4">
                <div
                  className={
                    `hidden md:flex items-center justify-start gap-3 transition-opacity ` +
                    (isTabsSticky ? 'opacity-100' : 'opacity-0 pointer-events-none')
                  }
                >
                  {isUserRegistered ? (
                    <Button variant="outline" disabled className="whitespace-nowrap gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Registered
                    </Button>
                  ) : (
                    <Button onClick={handleRegister} disabled={!conf.isRegistrationOpen} className="whitespace-nowrap">
                      Register
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground max-w-[280px] line-clamp-2">{conf.name}</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="app-container py-6">
          <Tabs value={activeTab} onValueChange={(v) => setTab(normalizeTab(v))}>
            <TabsContent value="about" className="mt-0">
              <AboutTab conference={aboutData} onRegister={handleRegister} onSubmit={handleSubmit} />
            </TabsContent>

            <TabsContent value="program" className="mt-0">
              {programLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : programDays.length === 0 ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h2 className="font-semibold">Program</h2>
                      <p className="text-sm text-muted-foreground">Program schedule will be published soon.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ProgramTab
                  conferenceId={String(conf.id)}
                  days={programDays}
                  isLoading={programLoading}
                  isAuthenticated={isAuthenticated}
                  onToggleFavorite={(presentationId) => toggleFavorite(String(presentationId))}
                  onPresentationClick={handlePresentationClick}
                />
              )}
            </TabsContent>

            <TabsContent value="people" className="mt-0">
              {speakersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <PeopleTab conferenceId={String(conf.id)} speakers={speakers} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Presentation Detail Modal */}
      <PresentationDetailModal
        presentation={selectedPresentation}
        open={!!selectedPresentation}
        onOpenChange={(open) => !open && setSelectedPresentation(null)}
        isAuthenticated={isAuthenticated}
        onToggleFavorite={(presentationId) => toggleFavorite(presentationId)}
      />
    </>
  );
}
