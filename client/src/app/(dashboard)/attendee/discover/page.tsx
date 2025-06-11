"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchIcon } from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ConferenceCard from "@/components/ConferenceCard";

interface Conference {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  venue?: string;
  topics?: string[];
  organizer: string;
  attendeeCount: number;
  capacity?: number;
  websiteUrl?: string;
  isRegistered?: boolean;
}

export default function DiscoverConferencesPage() {
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchConferences = async () => {
      try {
        setIsLoading(true);
        
        let response;
        let isAuthenticatedRequest = false;
        
        // Try authenticated API first
        try {
          const api = await createAuthenticatedApi();
          response = await api.get('/api/attendee/discover');
          isAuthenticatedRequest = true;
        } catch (authError) {
          // Fallback to public API for guest users
          const publicResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/attendee/discover`);
          const data = await publicResponse.json();
          response = { data };
          isAuthenticatedRequest = false;
        }
        
        // Handle different response structures
        const conferenceData = response.data?.conferences || response.conferences || [];
        const userContextData = response.data?.userContext || {
          isAuthenticated: isAuthenticatedRequest,
          userRole: isAuthenticatedRequest ? 'attendee' : 'guest'
        };
        
        setConferences(conferenceData);
        setUserContext(userContextData);
        
        console.log('[DEBUG] Discover page data:', {
          conferencesCount: conferenceData.length,
          userContext: userContextData,
          firstConferenceRegistered: conferenceData[0]?.isRegistered,
          authenticatedRequest: isAuthenticatedRequest
        });
        
      } catch (error: any) {
        console.error("Error fetching conferences:", error);
        toast.error("Couldn't load conferences");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConferences();
  }, []);

  // Handle registration changes from ConferenceCard
  const handleRegistrationChange = (conferenceId: number, isRegistered: boolean) => {
    setConferences(prev => 
      prev.map(conf => 
        conf.id === conferenceId 
          ? { ...conf, isRegistered, attendeeCount: isRegistered ? conf.attendeeCount + 1 : conf.attendeeCount - 1 }
          : conf
      )
    );
  };

  const filtered = conferences.filter((conf) =>
    conf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conf.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conf.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conf.topics || []).some((t) =>
      t.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            Discover Conferences
          </h1>
          <div className="relative w-full sm:w-auto max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search conferences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((conf, index) => (
            <motion.div
              key={conf.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ConferenceCard 
                conf={conf} 
                userContext={userContext}
                onRegistrationChange={handleRegistrationChange}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No conferences found</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Try adjusting your search or check back later for new events.
          </p>
        </div>
      )}
    </div>
  );
}