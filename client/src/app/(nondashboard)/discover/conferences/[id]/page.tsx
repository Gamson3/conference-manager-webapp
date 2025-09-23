"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  MapPin, Calendar, Users, Heart, CheckCircle, X, Clock,
  FileText, Presentation, Award, Info, ArrowLeft,
  BookOpen, Mic, Sparkles
} from 'lucide-react';
import { api } from '@/state/api';
import { useAuth } from '@/app/(auth)/authContext';
import ConferenceTreeView from '@/components/ConferenceTreeView';
import LoadingStates from '@/components/shared/LoadingStates';
import ConferenceCallToAction from '@/components/conference/ConferenceCallToAction';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function PublicConferenceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const conferenceId = params.id as string;

  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  const {
    data: conference,
    isLoading,
    error
  } = api.useConferenceDetailsQuery(conferenceId);

  const [toggleFavorite] = api.useToggleConferenceFavoriteMutation();
  const [registerForConference] = api.useRegisterForConferenceMutation();
  const [unregisterFromConference] = api.useUnregisterFromConferenceMutation();

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/conferences/${conferenceId}`);
      return;
    }
    try {
      await toggleFavorite({
        conferenceId: Number(conferenceId),
        isFavorite: !(conference?.userInteractions?.isFavorited ?? false)
      }).unwrap();
    } catch {
      toast.error("Unable to update favorite");
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/conferences/${conferenceId}`);
      return;
    }
    try {
      await registerForConference({ conferenceId: Number(conferenceId) }).unwrap();
      toast.success("Registered");
    } catch (e: any) {
      toast.error(e?.data?.message || "Registration failed");
    }
  };

  const handleUnregister = () => {
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/conferences/${conferenceId}`);
      return;
    }
    setShowConfirmation(true);
  };

  const confirmUnregister = async () => {
    try {
      await unregisterFromConference({ conferenceId: Number(conferenceId) }).unwrap();
      setShowConfirmation(false);
      toast.success("Unregistered");
    } catch {
      toast.error("Failed to unregister");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto p-6">
          <LoadingStates variant="cards" count={3} />
        </div>
      </div>
    );
  }

  if (error || !conference) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto p-6">
          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="py-16 text-center">
              <h1 className="text-2xl font-semibold mb-4">Conference Not Found</h1>
              <Button onClick={() => router.push('/discover')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Discover
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const dateRange = conference.startDate && conference.endDate
    ? `${format(new Date(conference.startDate), 'MMM d')} - ${format(new Date(conference.endDate), 'MMM d, yyyy')}`
    : 'Date TBD';

  const isRegistered = !!conference.userInteractions?.isRegistered;
  const isFavorited = !!conference.userInteractions?.isFavorited;

  const showSubmissionCta = conference.status === 'call_for_papers'
    && conference.submissionSettings?.enableSubmissions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        <Button
          variant="ghost"
            onClick={() => router.push('/discover')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Discover
        </Button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur overflow-hidden">
            <div className="relative">
              <div className="relative h-56 md:h-72">
                {conference.bannerImageUrl ? (
                  <img
                    src={conference.bannerImageUrl}
                    alt={conference.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-indigo-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
              </div>
              <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end">
                <div className="flex flex-wrap gap-2 mb-4">
                  {conference.categories?.map((c: any) => (
                    <Badge key={c.id} className="bg-white/20 text-white border-white/30">
                      {c.name}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow">
                  {conference.name}
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white/90">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5" />
                    <div>
                      <p className="text-xs uppercase opacity-70">Dates</p>
                      <p className="font-medium">{dateRange}</p>
                    </div>
                  </div>
                  {conference.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5" />
                      <div>
                        <p className="text-xs uppercase opacity-70">Location</p>
                        <p className="font-medium">{conference.location}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5" />
                    <div>
                      <p className="text-xs uppercase opacity-70">Registered</p>
                      <p className="font-medium">{conference._count?.attendances || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <CardContent className="border-t border-gray-200/50 bg-white/60">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  {!isAuthenticated && (
                    <Button
                      onClick={() => router.push(`/signin?redirect=/conferences/${conferenceId}`)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Sign In to Register or Favorite
                    </Button>
                  )}

                  {isAuthenticated && !isRegistered && (
                    <Button
                      onClick={handleRegister}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Register
                    </Button>
                  )}

                  {isAuthenticated && isRegistered && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 px-4 py-2">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Registered
                    </Badge>
                  )}

                  {/* Favorite */}
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      onClick={handleFavoriteToggle}
                      className={isFavorited
                        ? "border-rose-300 bg-rose-50 text-rose-600"
                        : ""
                      }
                    >
                      <Heart
                        className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`}
                      />
                      {isFavorited ? 'Favorited' : 'Add Favorite'}
                    </Button>
                  )}
                </div>

                {isAuthenticated && isRegistered && (
                  <Button
                    variant="outline"
                    onClick={handleUnregister}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Registration
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Card className="border-0 bg-white/70 backdrop-blur">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="p-4 border-b bg-white/60">
                <TabsList className="bg-white">
                  <TabsTrigger value="overview">
                    <Info className="h-4 w-4 mr-2" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="schedule">
                    <Clock className="h-4 w-4 mr-2" /> Schedule
                  </TabsTrigger>
                  <TabsTrigger value="presenters">
                    <Mic className="h-4 w-4 mr-2" /> Presenters
                  </TabsTrigger>
                  <TabsTrigger value="materials">
                    <BookOpen className="h-4 w-4 mr-2" /> Materials
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="p-6 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <Card className="border bg-white/60">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-indigo-600" />
                          Aims & Scope
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {conference.description || 'No description provided.'}
                        </p>
                      </CardContent>
                    </Card>

                    {conference.presentationTypes?.length > 0 && (
                      <Card className="border bg-white/60">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Presentation className="h-5 w-5 text-purple-600" />
                            Presentation Formats
                          </CardTitle>
                          <CardDescription>
                            Available formats for accepted submissions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {conference.presentationTypes.map((type: any) => (
                              <div
                                key={type.id}
                                className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/60"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="h-4 w-4 text-purple-600" />
                                  <h4 className="font-semibold">{type.name}</h4>
                                </div>
                                {type.description && (
                                  <p className="text-sm text-muted-foreground">{type.description}</p>
                                )}
                                <p className="mt-2 text-xs text-purple-700 font-medium">
                                  Duration: {type.defaultDuration} min
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="space-y-6">
                    <Card className="border bg-white/60">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-emerald-600" />
                          Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Registered</span>
                          <span className="text-lg font-semibold text-emerald-600">
                            {conference._count?.attendances || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Days</span>
                          <span className="text-lg font-semibold text-emerald-600">
                            {conference.days?.length || 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border bg-white/60">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-orange-600" />
                          Important Dates
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {conference.deadlines?.length ? (
                          <ul className="space-y-3">
                            {conference.deadlines.slice(0, 5).map((d: any) => (
                              <li key={d.id} className="flex justify-between text-sm border-b pb-2">
                                <span className="font-medium text-gray-700">{d.label}</span>
                                <span className="text-orange-600 font-semibold">
                                  {format(new Date(d.date), 'MMM d')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No dates published yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="p-6">
                <Card className="border bg-white/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-indigo-600" />
                      Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conference.days?.length ? (
                      <ConferenceTreeView conference={conference} />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        Schedule not published yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="presenters" className="p-6">
                <Card className="border bg-white/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-5 w-5 text-green-600" />
                      Presenters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const presenters: any[] = [];
                      conference.days?.forEach(day =>
                        day.sections?.forEach(section =>
                          section.timeSlots?.forEach(slot => {
                            if (slot.presentation) {
                              slot.presentation.authors?.forEach(author => {
                                if (author.isPresenter) {
                                  const existing = presenters.find(p => p.name === author.authorName);
                                  if (existing) {
                                    existing.presentations.push(slot.presentation!.title);
                                  } else {
                                    presenters.push({
                                      name: author.authorName,
                                      affiliation: author.affiliation,
                                      presentations: [slot.presentation!.title]
                                    });
                                  }
                                }
                              });
                            }
                          })
                        )
                      );
                      if (!presenters.length) {
                        return <p className="text-sm text-muted-foreground">No presenters listed yet.</p>;
                      }
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {presenters.map((p, i) => (
                            <Card key={i} className="border bg-gradient-to-br from-green-50 to-green-100/60">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">
                                    {p.name.charAt(0)}
                                  </div>
                                  {p.name}
                                </CardTitle>
                                {p.affiliation && (
                                  <CardDescription>{p.affiliation}</CardDescription>
                                )}
                              </CardHeader>
                              <CardContent>
                                <ul className="text-xs space-y-1">
                                  {p.presentations.slice(0, 3).map((t: string, idx: number) => (
                                    <li key={idx} className="text-gray-700 line-clamp-2">{t}</li>
                                  ))}
                                  {p.presentations.length > 3 && (
                                    <li className="text-green-700 font-medium">
                                      +{p.presentations.length - 3} more
                                    </li>
                                  )}
                                </ul>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="materials" className="p-6">
                <Card className="border bg-white/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conference.materials?.length ? (
                      <ul className="space-y-3 text-sm">
                        {conference.materials.map((m: any) => (
                          <li key={m.id} className="border p-3 rounded bg-purple-50/50">
                            {m.title}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No materials available yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* CFP / Submission CTA */}
        {showSubmissionCta && (
          <div className="mt-8">
            <ConferenceCallToAction
              conferenceId={parseInt(conferenceId)}
              userId={user?.id}
              conference={conference}
              submissionSettings={conference.submissionSettings}
            />
          </div>
        )}
      </div>

      {/* Unregister Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Registration?</DialogTitle>
            <DialogDescription>
              You can re-register later if spaces remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>Keep</Button>
            <Button variant="destructive" onClick={confirmUnregister}>Cancel Registration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}