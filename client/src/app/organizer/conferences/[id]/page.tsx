"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Conference Root Page - Redirects to Home Dashboard
 * 
 * This page serves as a redirect entry point. When users navigate to
 * /organizer/conferences/[id], they are automatically redirected to
 * /organizer/conferences/[id]/home where the main dashboard lives.
 * 
 * This supports the new IA structure where "Home" is the operations hub.
 */
export default function ConferenceRootPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params?.id;

  useEffect(() => {
    if (conferenceId) {
      router.replace(`/organizer/conferences/${conferenceId}/home`);
    }
  }, [conferenceId, router]);

  // Show nothing while redirecting (prevents flash)
  return null;
}
