"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  SearchIcon,
} from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import ConferenceCard, { Conference } from "@/components/ConferenceCard";



export default function DiscoverConferencesPage() {
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchConferences = async () => {
      try {
        setIsLoading(true);
        const api = await createAuthenticatedApi();
        // Adjust endpoint as needed
        const response = await api.get("/conferences");
        setConferences(response.data);
      } catch (error: any) {
        toast.error("Couldn't load conferences");
      } finally {
        setIsLoading(false);
      }
    };
    fetchConferences();
  }, []);

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
              <ConferenceCard conf={conf} />
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