"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { 
  CalendarIcon, 
  MapPinIcon, 
  ClockIcon,
  UsersIcon,
  ExternalLinkIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  BookOpenIcon,
  TrendingUpIcon
} from "lucide-react";
import { motion } from "framer-motion";

interface Conference {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  submissionSettings: {
    submissionDeadline: string;
    allowLateSubmissions: boolean;
    requireAbstract: boolean;
    maxAbstractLength: number;
    requireFullPaper: boolean;
    allowedFileTypes: string[];
    maxFileSize: number;
    requireAuthorBio: boolean;
    requireAffiliation: boolean;
  };
  _count: {
    attendees: number;
    sections: number;
  };
}

export default function PresenterDiscoverPage() {
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    try {
      setIsLoading(true);
      const api = await createAuthenticatedApi();
      // Specifically fetch conferences accepting submissions
      const response = await api.get('/api/attendee/discover-conferences?includeCallForPapers=true&status=call_for_papers');
      setConferences(response.data.conferences || []);
    } catch (error: any) {
      console.error('Error fetching conferences:', error);
      toast.error('Failed to load conferences');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConferences = conferences.filter(conference => {
    const matchesSearch = conference.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conference.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = filterLocation === 'all' || 
                           conference.location.toLowerCase().includes(filterLocation.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  const getDeadlineStatus = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { status: 'expired', text: 'Deadline passed', color: 'bg-red-100 text-red-800' };
    if (daysLeft < 7) return { status: 'urgent', text: `${daysLeft} days left`, color: 'bg-orange-100 text-orange-800' };
    if (daysLeft < 30) return { status: 'soon', text: `${daysLeft} days left`, color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'open', text: `${daysLeft} days left`, color: 'bg-green-100 text-green-800' };
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 pb-20">
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-white/50 rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-white/50 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpenIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Conferences</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Find conferences accepting submissions and share your research with the world
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conferences..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-violet-300"
                />
              </div>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:border-violet-300 focus:outline-none"
              >
                <option value="all">All Locations</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Hybrid</option>
                <option value="in-person">In-Person</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Conferences Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {filteredConferences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConferences.map((conference, index) => {
              const deadlineInfo = getDeadlineStatus(conference.submissionSettings?.submissionDeadline);
              
              return (
                <motion.div
                  key={conference.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm group cursor-pointer h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      {/* Header */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-2">
                            {conference.name}
                          </h3>
                          <Badge className={deadlineInfo.color}>
                            {deadlineInfo.text}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 line-clamp-3 mb-4">
                          {conference.description}
                        </p>
                      </div>

                      {/* Conference Details */}
                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4 text-violet-500" />
                          <span>
                            {new Date(conference.startDate).toLocaleDateString()} - 
                            {new Date(conference.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPinIcon className="h-4 w-4 text-violet-500" />
                          <span>{conference.location}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <ClockIcon className="h-4 w-4 text-violet-500" />
                          <span>Deadline: {new Date(conference.submissionSettings?.submissionDeadline).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <UsersIcon className="h-4 w-4 text-violet-500" />
                            <span>{conference._count?.attendees || 0} attendees</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUpIcon className="h-4 w-4 text-violet-500" />
                            <span>{conference._count?.sections || 0} sessions</span>
                          </div>
                        </div>
                      </div>

                      {/* Submission Requirements Preview */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements</h4>
                        <div className="flex flex-wrap gap-1">
                          {conference.submissionSettings?.requireAbstract && (
                            <Badge variant="outline" className="text-xs">Abstract</Badge>
                          )}
                          {conference.submissionSettings?.requireFullPaper && (
                            <Badge variant="outline" className="text-xs">Full Paper</Badge>
                          )}
                          {conference.submissionSettings?.requireAuthorBio && (
                            <Badge variant="outline" className="text-xs">Author Bio</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Max {conference.submissionSettings?.maxFileSize || 50}MB
                          </Badge>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => router.push(`/presenter/submit/${conference.id}`)}
                        className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600"
                        disabled={deadlineInfo.status === 'expired'}
                      >
                        {deadlineInfo.status === 'expired' ? (
                          'Submissions Closed'
                        ) : (
                          <>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Submit Presentation
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <BookOpenIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No conferences found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm || filterLocation !== 'all' 
                  ? "Try adjusting your search or filter criteria" 
                  : "No conferences are currently accepting submissions"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}