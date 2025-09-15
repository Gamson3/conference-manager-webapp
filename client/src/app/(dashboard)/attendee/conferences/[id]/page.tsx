"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  MapPin, Calendar, Users, Heart, Download, 
  PlusCircle, CheckCircle, X, Star, Clock,
  FileText, Presentation, Award, Info,
  ArrowLeft, ExternalLink, UserCheck,
  BookOpen, Mic, Coffee, Sparkles
} from 'lucide-react';
import DashboardPageLayout from '@/components/DashboardPageLayout';

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
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CancelButton } from '@/components/cancel-button';
import { toast } from 'sonner';

export default function ConferenceDetailPage({ params: routeParams }: { params: { id: string } }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const conferenceId = params.id as string;

  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
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
      router.push(`/signin?redirect=/discover/conference/${conferenceId}`);
      return;
    }
    
    try {
      await toggleFavorite({
        conferenceId: Number(conferenceId),
        isFavorite: !(conference?.userInteractions?.isFavorited ?? false)
      }).unwrap();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/discover/conferences/${conferenceId}`);
      return;
    }
    
    try {
      await registerForConference({ 
        conferenceId: Number(conferenceId) 
      }).unwrap();
      toast.success("Successfully registered for this conference");
    } catch (error: any) {
      console.error('Error registering for conference:', error);
      
      if (error.status === 400) {
        toast.error("You're already registered for this conference");
      } else if (error.status === 404) {
        toast.error("Conference not found or no longer available");
      } else {
        toast.error("Failed to register for this conference. Please try again.");
      }
    }
  };

  const handleUnregister = async () => {
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/discover/conferences/${conferenceId}`);
      return;
    }
    setShowConfirmation(true);
  };

  const confirmUnregister = async () => {
    try {
      await unregisterFromConference({ conferenceId: Number(conferenceId) }).unwrap();
      setShowConfirmation(false);
      toast.success("Successfully unregistered from conference");
    } catch (error: any) {
      console.error('Error unregistering from conference:', error);
      toast.error("Failed to unregister from this conference. Please try again.");
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <LoadingStates variant="cards" count={3} />
        </div>
      </div>
    </div>
  );
  
  if (error || !conference) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Conference Not Found</h1>
              <p className="text-gray-600 mb-6">The conference you're looking for doesn't exist or has been removed.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Button 
            variant="ghost" 
            onClick={() => router.push('/discover')}
            className="mb-4 hover:bg-white/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discover
          </Button>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden"
        >
          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm overflow-hidden">
            {/* Header with gradient background */}
            <div className="relative">
              {conference.bannerImageUrl ? (
                <div className="relative h-64 lg:h-80">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600/80 via-primary-700/80 to-primary-800/80 z-10" />
                  <img 
                    src={conference.bannerImageUrl} 
                    alt={conference.name}
                    className="w-full h-full object-cover" 
                  />
                </div>
              ) : (
                <div className="h-64 lg:h-80 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800" />
              )}
              
              <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end text-white">
                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {conference.categories?.map(category => (
                    <Badge 
                      key={category.id} 
                      className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-lg">
                  {conference.name}
                </h1>

                {/* Conference Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white/90">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Date</p>
                      <p className="font-semibold">{dateRange}</p>
                    </div>
                  </div>
                  
                  {conference.location && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm opacity-80">Location</p>
                        <p className="font-semibold">{conference.location}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Attendees</p>
                      <p className="font-semibold">{conference._count?.attendances || 0} registered</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <CardContent className="p-6 border-t border-gray-200/50">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  {/* Registration Status */}
                  {conference.userInteractions?.isRegistered ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2 text-sm">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Registered
                    </Badge>
                  ) : (
                    <Button
                      onClick={handleRegister}
                      className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg px-6"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Register Now
                    </Button>
                  )}

                  {/* Favorite Button */}
                  <Button
                    variant="outline"
                    onClick={handleFavoriteToggle}
                    className={`border-2 ${
                      conference.userInteractions?.isFavorited 
                        ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <Heart 
                      className={`h-4 w-4 mr-2 ${
                        conference.userInteractions?.isFavorited ? 'fill-rose-500 text-rose-500' : ''
                      }`} 
                    />
                    {conference.userInteractions?.isFavorited ? 'Favorited' : 'Add to Favorites'}
                  </Button>
                </div>

                {/* Unregister for registered users */}
                {conference.userInteractions?.isRegistered && (
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

        {/* Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8"
        >
          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Enhanced Tab List */}
                <div className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50 p-6">
                  <TabsList className="bg-white/60 border border-gray-200/50 shadow-sm">
                    <TabsTrigger 
                      value="overview"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="schedule"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule
                    </TabsTrigger>
                    <TabsTrigger 
                      value="presenters"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Presenters
                    </TabsTrigger>
                    <TabsTrigger 
                      value="materials"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Materials
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="p-6 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                      {/* Description */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <Card className="border border-gray-200/50 bg-white/50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
                                <FileText className="h-5 w-5" />
                              </div>
                              Aims & Scope
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-gray max-w-none">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {conference.description || 'This conference brings together leading researchers, practitioners, and industry experts to share cutting-edge research and innovations in the field.'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Presentation Types */}
                      {conference.presentationTypes?.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        >
                          <Card className="border border-gray-200/50 bg-white/50">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
                                  <Presentation className="h-5 w-5" />
                                </div>
                                Presentation Formats
                              </CardTitle>
                              <CardDescription>
                                Various ways to share your research and expertise
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {conference.presentationTypes.map((type: any) => (
                                  <div key={type.id} className="p-4 border border-gray-200/50 rounded-lg bg-gradient-to-br from-purple-50/50 to-purple-100/50">
                                    <div className="flex items-center gap-3 mb-2">
                                      <Sparkles className="h-4 w-4 text-purple-600" />
                                      <h4 className="font-semibold text-gray-900">{type.name}</h4>
                                    </div>
                                    {type.description && (
                                      <p className="text-sm text-gray-600">{type.description}</p>
                                    )}
                                    <div className="mt-2 text-xs text-purple-600 font-medium">
                                      Duration: {type.defaultDuration} minutes
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      {/* Quick Stats */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                      >
                        <Card className="border border-gray-200/50 bg-gradient-to-br from-emerald-50/50 to-emerald-100/50">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Award className="h-5 w-5 text-emerald-600" />
                              Conference Stats
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Registered</span>
                              <span className="text-xl font-bold text-emerald-600">
                                {conference._count?.attendances || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Presentations</span>
                              <span className="text-xl font-bold text-emerald-600">
                                {conference.days?.reduce((total, day) => 
                                  total + (day.sections?.reduce((sTotal, section) => 
                                    sTotal + (section.timeSlots?.filter(slot => slot.presentation).length || 0), 0) || 0), 0) || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Days</span>
                              <span className="text-xl font-bold text-emerald-600">
                                {conference.days?.length || 0}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Important Dates */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      >
                        <Card className="border border-gray-200/50 bg-gradient-to-br from-orange-50/50 to-orange-100/50">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-orange-600" />
                              Important Dates
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {conference.deadlines?.length > 0 ? (
                              <ul className="space-y-3">
                                {conference.deadlines.slice(0, 4).map((deadline: any) => (
                                  <li key={deadline.id} className="flex items-center justify-between border-b border-orange-200/50 pb-2">
                                    <span className="text-sm font-medium text-gray-700">{deadline.label}</span>
                                    <span className="text-sm text-orange-600 font-semibold">
                                      {format(new Date(deadline.date), 'MMM d')}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-center py-4">
                                <Clock className="h-8 w-8 text-orange-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No dates published yet</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </div>
                </TabsContent>

                {/* Schedule Tab */}
                <TabsContent value="schedule" className="p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="border border-gray-200/50 bg-white/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
                            <Clock className="h-5 w-5" />
                          </div>
                          Conference Schedule
                        </CardTitle>
                        <CardDescription>
                          Browse sessions, presentations, and networking events organized by day
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {conference.days && conference.days.length > 0 ? (
                          <ConferenceTreeView conference={conference} />
                        ) : (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Clock className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule Coming Soon</h3>
                            <p className="text-gray-600 mb-4">
                              The conference schedule hasn't been published yet. Check back later!
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                {/* Presenters Tab */}
                <TabsContent value="presenters" className="p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="border border-gray-200/50 bg-white/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
                            <Mic className="h-5 w-5" />
                          </div>
                          Featured Presenters
                        </CardTitle>
                        <CardDescription>
                          Meet the experts sharing their knowledge at this conference
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const presenters: any[] = [];
                          
                          conference.days?.forEach(day => {
                            day.sections?.forEach(section => {
                              section.timeSlots?.forEach(slot => {
                                if (slot.presentation) {
                                  slot.presentation.authors?.forEach(author => {
                                    if (author.isPresenter) {
                                      const existingPresenter = presenters.find(p => 
                                        p.name === author.authorName
                                      );
                                      
                                      if (existingPresenter) {
                                        existingPresenter.presentations.push({
                                          id: slot.presentation!.id,
                                          title: slot.presentation!.title
                                        });
                                      } else {
                                        presenters.push({
                                          name: author.authorName,
                                          affiliation: author.affiliation,
                                          presentations: [{
                                            id: slot.presentation!.id,
                                            title: slot.presentation!.title
                                          }]
                                        });
                                      }
                                    }
                                  });
                                }
                              });
                            });
                          });
                          
                          return presenters.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {presenters.map((presenter, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.4, delay: index * 0.1 }}
                                >
                                  <Card className="border border-gray-200/50 bg-gradient-to-br from-green-50/50 to-green-100/50 hover:shadow-lg transition-all duration-300">
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-lg flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                          {presenter.name.charAt(0)}
                                        </div>
                                        {presenter.name}
                                      </CardTitle>
                                      {presenter.affiliation && (
                                        <CardDescription className="text-green-700">{presenter.affiliation}</CardDescription>
                                      )}
                                    </CardHeader>
                                    <CardContent>
                                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <Star className="h-4 w-4 text-green-600" />
                                        Presentations ({presenter.presentations.length})
                                      </h4>
                                      <ul className="space-y-2">
                                        {presenter.presentations.slice(0, 2).map(presentation => (
                                          <li key={presentation.id} className="text-sm text-gray-700 line-clamp-2">
                                            {presentation.title}
                                          </li>
                                        ))}
                                        {presenter.presentations.length > 2 && (
                                          <li className="text-xs text-green-600 font-medium">
                                            +{presenter.presentations.length - 2} more presentations
                                          </li>
                                        )}
                                      </ul>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-16">
                              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mic className="h-8 w-8 text-green-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">Presenters Coming Soon</h3>
                              <p className="text-gray-600">
                                Presenter information will be available once the schedule is finalized.
                              </p>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                {/* Materials Tab */}
                <TabsContent value="materials" className="p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="border border-gray-200/50 bg-white/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          Conference Resources
                        </CardTitle>
                        <CardDescription>
                          Access presentation slides, papers, and additional materials
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {conference.materials && conference.materials.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {conference.materials.map(material => (
                              <motion.div
                                key={material.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                                className="group"
                              >
                                <Card className="border border-gray-200/50 bg-gradient-to-br from-purple-50/50 to-purple-100/50 hover:shadow-lg transition-all duration-300">
                                  <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                                          {material.title}
                                        </h4>
                                        {material.description && (
                                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                            {material.description}
                                          </p>
                                        )}
                                        <p className="text-xs text-purple-600 font-medium">
                                          Added {format(new Date(material.uploadedAt), 'MMM d, yyyy')}
                                        </p>
                                      </div>
                                      <div className="p-2 bg-purple-500 rounded-lg text-white ml-4">
                                        <FileText className="h-5 w-5" />
                                      </div>
                                    </div>
                                    <Button 
                                      asChild 
                                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                                    >
                                      <a 
                                        href={material.fileUrl} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                      </a>
                                    </Button>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <BookOpen className="h-8 w-8 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Materials Coming Soon</h3>
                            <p className="text-gray-600 mb-4">
                              Conference materials will be available closer to the event date.
                            </p>
                            <Button variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50">
                              <Coffee className="h-4 w-4 mr-2" />
                              Get Notified
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call to Action - Enhanced for Speaker Submissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8"
        >
          <ConferenceCallToAction 
            conferenceId={parseInt(params.id as string)}
            userId={user?.id}
            conference={conference}
            submissionSettings={conference.submissionSettings}
          />
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="bg-white border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Confirm Unregistration</DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to cancel your registration for <strong>{conference.name}</strong>? 
                You can register again later if you change your mind.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                className="border-gray-200"
              >
                Keep Registration
              </Button>
              <Button 
                onClick={confirmUnregister}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Unregister
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}