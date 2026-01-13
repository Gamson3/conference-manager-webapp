"use client";

import React from "react";
import { X, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useImpersonation,
  type ImpersonationState,
} from "@/features/auth/hooks/useImpersonation";

interface ImpersonationBannerProps {
  /** Optional: provide impersonation state externally (for testing or context sharing) */
  impersonationState?: ImpersonationState | null;
  /** Optional: custom end handler */
  onEnd?: () => void;
}

/**
 * Banner displayed when an organizer is impersonating a conference participant.
 *
 * Shows impersonated user info and provides an "End Session" button.
 * Renders at the top of the page with a distinctive warning color.
 */
export function ImpersonationBanner({
  impersonationState,
  onEnd,
}: ImpersonationBannerProps): React.ReactElement | null {
  const { impersonation: hookImpersonation, endImpersonation, loading } = useImpersonation();

  const impersonation = impersonationState ?? hookImpersonation;

  if (!impersonation) {
    return null;
  }

  const handleEnd = async (): Promise<void> => {
    if (onEnd) {
      onEnd();
    } else {
      await endImpersonation();
    }
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-4 text-sm font-medium">
      <div className="flex items-center gap-2 min-w-0">
        <UserCircle className="h-5 w-5 flex-shrink-0" />
        <span className="truncate">
          Acting as{" "}
          <strong className="font-semibold">
            {impersonation.impersonatedUser.name}
          </strong>
          <span className="hidden sm:inline">
            {" "}
            ({impersonation.impersonatedUser.email})
          </span>
          <span className="hidden md:inline text-amber-800">
            {" "}
            in {impersonation.conferenceName}
          </span>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnd}
        disabled={loading}
        className="flex-shrink-0 bg-amber-100 border-amber-600 text-amber-900 hover:bg-amber-200 hover:text-amber-950"
      >
        <X className="h-4 w-4 mr-1" />
        {loading ? "Ending..." : "End Session"}
      </Button>
    </div>
  );
}

export default ImpersonationBanner;
