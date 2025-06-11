"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Globe, Eye, Users, ArrowRight, ExternalLink } from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  conferenceId: string;
  currentStatus: string;
  onSuccess: () => void;
}

export default function ConferencePublishDialog({
  open,
  onClose,
  conferenceId,
  currentStatus,
  onSuccess
}: PublishDialogProps) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const router = useRouter();

  // Validate when dialog opens
  useEffect(() => {
    if (open) {
      validateConference();
    }
  }, [open]);

  const validateConference = async () => {
    try {
      setValidating(true);
      const api = await createAuthenticatedApi();
      const response = await api.get(`/events/${conferenceId}/publish-validation`);
      
      // ADD: Debug logging to see what we get
      console.log('Validation response:', response.data);
      console.log('Is ready:', response.data.isReady);
      console.log('Issues:', response.data.issues);
      
      setValidation(response.data);
    } catch (error: any) {
      console.error("Error validating conference:", error);
      toast.error("Failed to validate conference");
    } finally {
      setValidating(false);
    }
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      
      if (currentStatus === 'published') {
        await api.post(`/events/${conferenceId}/unpublish`);
        toast.success("Conference unpublished successfully");
      } else {
        await api.post(`/events/${conferenceId}/publish`);
        toast.success("Conference published successfully!");
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error publishing/unpublishing conference:", error);
      toast.error(error.response?.data?.message || "Failed to update conference status");
    } finally {
      setLoading(false);
    }
  };

  // ADD: Helper function to navigate to fix issues
  const handleFixIssues = () => {
    onClose();
    // Navigate to sessions page where they can assign authors
    router.push(`/organizer/events/${conferenceId}/sessions`);
  };

  const isPublished = currentStatus === 'published';
  const canPublish = !validating && validation && validation.isReady;
  const hasIssues = !validating && validation && !validation.isReady && !isPublished;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPublished ? (
              <>
                <Eye className="h-5 w-5" />
                Unpublish Conference
              </>
            ) : (
              <>
                <Globe className="h-5 w-5" />
                Publish Conference
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isPublished 
              ? "This will make your conference private and hide it from attendees."
              : "This will make your conference visible to attendees and allow registrations."
            }
          </DialogDescription>
        </DialogHeader>

        {validating ? (
          <div className="py-6 text-center">
            <div className="animate-spin h-6 w-6 mx-auto mb-2 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-gray-500">Validating conference...</p>
          </div>
        ) : validation && (
          <div className="space-y-4">
            {/* Conference Summary */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">{validation.conference.name}</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Days:</span> {validation.conference.dayCount || 0}
                </div>
                <div>
                  <span className="text-gray-500">Sessions:</span> {validation.conference.sectionCount || 0}
                </div>
                <div>
                  <span className="text-gray-500">Presentations:</span> {validation.conference.presentationCount || 0}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Status:</span>
              <Badge variant={currentStatus === 'published' ? 'default' : 'secondary'}>
                {currentStatus}
              </Badge>
            </div>

            {/* Validation Results */}
            {!isPublished && (
              <>
                {validation.isReady ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium text-green-800 mb-1">
                        ✅ Your conference is ready to be published!
                      </div>
                      <p className="text-sm text-green-700">
                        All requirements have been met. You can now publish your conference.
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium text-red-800 mb-2">
                        ⚠️ Please fix these issues before publishing:
                      </div>
                      <ul className="list-disc list-inside space-y-1 mb-3">
                        {validation.issues.map((issue: string, index: number) => (
                          <li key={index} className="text-sm text-red-700">{issue}</li>
                        ))}
                      </ul>
                      
                      {/* ADD: Action button to help users fix issues */}
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleFixIssues}
                          className="text-red-700 border-red-300 hover:bg-red-50"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Go to Sessions & Assign Authors
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* ADD: Debug information (remove in production) */}
            {/* {validation && (
              <div className="bg-blue-50 p-3 rounded text-xs">
                <strong>Debug Info:</strong>
                <div>Is Ready: {validation.isReady ? 'Yes' : 'No'}</div>
                <div>Issues Count: {validation.issues?.length || 0}</div>
                <div>Button Disabled: {(loading || (validating || (!isPublished && validation && !validation.isReady))).toString()}</div>
                {validation.issues && (
                  <div>Issues: {JSON.stringify(validation.issues)}</div>
                )}
              </div>
            )} */}
          </div>
        )}

        <DialogFooter className="flex flex-col! gap-3">
          <div>
          {/* ADD: Enhanced button section with clear messaging */}
          {hasIssues && (
            <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 mb-1">
                    Cannot publish yet
                  </p>
                  <p className="text-amber-700">
                    Please assign authors to all presentations before publishing your conference.
                  </p>
                </div>
              </div>
            </div>
          )}
          </div>
          
          <div className="flex justify-between w-full gap-3">
            <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="border-primary text-primary hover:bg-primary/5"
            >
              Cancel
            </Button>
            
            <div className="flex gap-2">
              {/* ADD: Quick fix button when there are issues */}
              {hasIssues && (
                <Button
                  variant="outline"
                  onClick={handleFixIssues}
                  disabled={loading}
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Fix Issues
                </Button>
              )}
              
              {/* Main publish button with enhanced styling */}
              <Button
                onClick={handlePublish}
                disabled={loading || (validating || (!isPublished && validation && !validation.isReady))}
                variant={isPublished ? "destructive" : "default"}
                className={`${
                  hasIssues 
                    ? "opacity-50 cursor-not-allowed bg-gray-300 hover:bg-gray-300" 
                    : canPublish
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : ""
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : isPublished ? (
                  "Unpublish"
                ) : hasIssues ? (
                  "Cannot Publish"
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Publish Conference
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}