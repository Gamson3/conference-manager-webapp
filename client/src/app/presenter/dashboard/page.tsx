"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { 
  PresentationIcon, 
  CalendarIcon, 
  FileIcon, 
  ClockIcon,
  TrendingUpIcon,
  ExternalLinkIcon,
  PlusIcon,
  StarIcon,
  EyeIcon,
  UsersIcon,
  BookOpenIcon,
  AwardIcon,
  Target,
  Zap,
  Globe,
  UserIcon
} from "lucide-react";
import { motion } from "framer-motion";

interface PresenterDashboardData {
  presenter: any;
  submissions: any[];
  upcomingPresentations: any[];
  conferences: any[];
  stats: {
    totalSubmissions: number;
    approvedPresentations: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    scheduledPresentations: number;
    totalMaterials: number;
  };
  userRole: string;
}

export default function PresenterDashboard() {
  const router = useRouter();
  const [data, setData] = useState<PresenterDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const api = await createAuthenticatedApi();
      const response = await api.get('/api/presenter/dashboard');
      
      setData(response.data);
    } catch (error: any) {
      console.error('Error fetching presenter dashboard:', error);
      setError(error.response?.data?.message || 'Failed to load presenter dashboard');
      toast.error('Failed to load presenter dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getDiscoverPath = () => {
    return '/presenter/discover'; // Always use presenter-specific discover
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Under Review</Badge>;
      case 'APPROVED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'REVISION_REQUESTED':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Revision Required</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 pb-20">
        <div className="animate-pulse space-y-8">
          {/* Hero Skeleton */}
          <div className="h-64 bg-gradient-to-r from-violet-200 to-blue-200 rounded-3xl"></div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-white/50 rounded-2xl"></div>
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-white/50 rounded-2xl"></div>
            <div className="h-96 bg-white/50 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 pb-20">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ExternalLinkIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Dashboard</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">{error}</p>
            <Button onClick={fetchDashboardData} className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto p-6 pb-20">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-violet-400 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <PresentationIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Presenter Hub</h2>
            <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
              Start your journey as a professional presenter. Create your profile and begin sharing your expertise with the world.
            </p>
            <Button className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-lg px-8 py-3">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 pb-20">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-600 p-8 md:p-12 mb-8"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="text-white mb-6 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome back, {data.presenter?.name?.split(' ')[0] || 'Presenter'}! 
            </h1>
            <p className="text-xl text-white/90 mb-6 max-w-2xl">
              Your presentation journey continues. Track your submissions, manage your upcoming talks, and grow your impact in the academic community.
            </p>
            
            <div className="flex flex-wrap gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                <span className="font-medium">{data.stats.totalSubmissions} submissions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span className="font-medium">{data.stats.scheduledPresentations} upcoming</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-violet-300 rounded-full"></div>
                <span className="font-medium">{data.conferences.length} conferences</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <Button
              onClick={() => router.push('/presenter/discover')}
              className="bg-white text-violet-600 hover:bg-white/90 font-semibold px-8 py-3 rounded-xl shadow-xl"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Submission
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/presenter/submissions')}
              className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-xl"
            >
              <EyeIcon className="h-5 w-5 mr-2" />
              View All Submissions
            </Button>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32"></div>
      </motion.div>

      {/* Enhanced Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {[
          {
            title: "Total Submissions",
            value: data.stats.totalSubmissions,
            icon: FileIcon,
            color: "from-blue-500 to-blue-600",
            textColor: "text-blue-600",
            bgColor: "bg-blue-50",
            change: "+12% this month"
          },
          {
            title: "Approved",
            value: data.stats.approvedPresentations,
            icon: TrendingUpIcon,
            color: "from-emerald-500 to-emerald-600",
            textColor: "text-emerald-600",
            bgColor: "bg-emerald-50",
            change: `${Math.round((data.stats.approvedPresentations / Math.max(data.stats.totalSubmissions, 1)) * 100)}% success rate`
          },
          {
            title: "Pending Review",
            value: data.stats.pendingSubmissions,
            icon: ClockIcon,
            color: "from-amber-500 to-amber-600",
            textColor: "text-amber-600",
            bgColor: "bg-amber-50",
            change: "Awaiting feedback"
          },
          {
            title: "Scheduled",
            value: data.stats.scheduledPresentations,
            icon: CalendarIcon,
            color: "from-violet-500 to-violet-600",
            textColor: "text-violet-600",
            bgColor: "bg-violet-50",
            change: "Next 3 months"
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm group hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                  <Badge variant="outline" className="text-xs text-gray-500">
                    {stat.change}
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Submissions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <FileIcon className="h-4 w-4 text-white" />
                    </div>
                    Recent Submissions
                  </CardTitle>
                  <p className="text-gray-600 mt-2">Track your latest presentation submissions</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/presenter/submissions')}
                  className="hover:bg-blue-50"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.submissions.length > 0 ? (
                <div className="space-y-4">
                  {data.submissions.slice(0, 4).map((submission, index) => (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="group p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer"
                      onClick={() => router.push(`/presenter/submissions/${submission.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {submission.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{submission.section?.conference.name}</p>
                        </div>
                        {getStatusBadge(submission.reviewStatus)}
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                        {submission.abstract}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Submitted: {new Date(submission.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-4">
                          <span>{submission.materials?.length || 0} materials</span>
                          <ExternalLinkIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions yet</h3>
                  <p className="text-gray-600 mb-6">Start your presentation journey by submitting to a conference</p>
                  <Button 
                    onClick={() => router.push(getDiscoverPath())}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Submit First Presentation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          {/* Upcoming Presentations */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-violet-600" />
                Upcoming Talks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcomingPresentations.length > 0 ? (
                <div className="space-y-3">
                  {data.upcomingPresentations.slice(0, 3).map((presentation, index) => (
                    <div key={presentation.id} className="p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1 mb-1">
                        {presentation.title}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">{presentation.section?.conference.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(presentation.section.conference.startDate).toLocaleDateString()}
                        </span>
                        <Badge variant="outline" className="text-xs">Scheduled</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No upcoming presentations</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievement Card */}
          {/* <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <AwardIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Presenter Level</h3>
                  <p className="text-sm text-gray-600">Track your progress</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Submissions</span>
                  <span className="font-medium">{data.stats.totalSubmissions}/10</span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((data.stats.totalSubmissions / 10) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600">
                  {10 - data.stats.totalSubmissions > 0 
                    ? `${10 - data.stats.totalSubmissions} more to unlock Expert Badge!`
                    : "🎉 Expert Badge Unlocked!"
                  }
                </p>
              </div>
            </CardContent>
          </Card> */}

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg backdrop-blur-sm bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 ">
                <Zap className="h-5 w-5 text-emerald-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => router.push('/presenter/profile')}
                variant="outline" 
                className="w-full justify-start hover:bg-emerald-50"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Update Profile
              </Button>
              <Button 
                onClick={() => router.push('/presenter/submissions')}
                variant="outline" 
                className="w-full justify-start hover:bg-blue-50"
              >
                <FileIcon className="h-4 w-4 mr-2" />
                Manage Submissions
              </Button>
              <Button 
                onClick={() => router.push(getDiscoverPath())}
                variant="outline" 
                className="w-full justify-start hover:bg-violet-50"
              >
                <Globe className="h-4 w-4 mr-2" />
                Find Conferences
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}