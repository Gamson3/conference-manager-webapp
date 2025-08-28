"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";

// Define the schema for the form
const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  abstract: z.string().min(100, "Abstract must be at least 100 characters"),
  conferenceId: z.string().min(1, "Please select a conference"),
  presentationTypeId: z.string().min(1, "Please select a presentation type"),
  keywords: z.string().min(3, "Please provide at least 3 keywords separated by commas"),
  affiliations: z.string().optional(),
  duration: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Conference {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  submissionDeadline: string;
}

interface PresentationType {
  id: number;
  name: string;
  description: string;
  defaultDuration: number;
}

export default function SubmitPresentation() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [presentationTypes, setPresentationTypes] = useState<PresentationType[]>([]);
  const [selectedConference, setSelectedConference] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      abstract: "",
      conferenceId: "",
      presentationTypeId: "",
      keywords: "",
      affiliations: "",
      duration: "",
    },
  });

  // Fetch available conferences for submission
  useEffect(() => {
    const fetchConferences = async () => {
      try {
        setIsLoading(true);
        const session = await fetchAuthSession();
        
        if (!session.tokens?.idToken) {
          console.error("No auth token available");
          return;
        }
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/conferences/accepting-submissions`, 
          {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken.toString()}`
            }
          }
        );
        
        setConferences(response.data.conferences || []);
      } catch (error) {
        console.error("Error fetching conferences:", error);
        toast.error("Failed to load available conferences.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConferences();
  }, [toast]);

  // Fetch presentation types when a conference is selected
  useEffect(() => {
    const fetchPresentationTypes = async () => {
      if (!selectedConference) return;
      
      try {
        const session = await fetchAuthSession();
        
        if (!session.tokens?.idToken) {
          console.error("No auth token available");
          return;
        }
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/conferences/${selectedConference}/presentation-types`, 
          {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken.toString()}`
            }
          }
        );
        
        setPresentationTypes(response.data.presentationTypes || []);
      } catch (error) {
        console.error("Error fetching presentation types:", error);
      }
    };
    
    fetchPresentationTypes();
  }, [selectedConference]);

  const onSubmit = async (data: FormValues, isDraft: boolean = false) => {
    try {
      setIsSubmitting(true);
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        toast.error("You must be logged in to submit a presentation");
        return;
      }
      
      // Transform form data for API
      const submitData = {
        ...data,
        conferenceId: parseInt(data.conferenceId),
        presentationTypeId: parseInt(data.presentationTypeId),
        keywords: data.keywords.split(",").map(k => k.trim()),
        affiliations: data.affiliations ? data.affiliations.split(",").map(a => a.trim()) : [],
        duration: data.duration ? parseInt(data.duration) : undefined,
        status: isDraft ? "draft" : "submitted",
      };
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/submissions`, 
        submitData,
        {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`
          }
        }
      );
      
      if (isDraft) {
        toast.success("Your presentation draft has been saved");
      } else {
        toast.success("Your presentation has been submitted for review");
      }
      
      // Redirect to the presentation detail page
      router.push(`/presenter/presentations/${response.data.id}`);
      
    } catch (error) {
      console.error("Error submitting presentation:", error);
      toast.error("There was an error submitting your presentation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConferenceChange = (value: string) => {
    setSelectedConference(value);
    form.setValue("conferenceId", value);
    form.setValue("presentationTypeId", "");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Submit a Presentation</CardTitle>
              <CardDescription>Loading available conferences...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (conferences.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Submit a Presentation</CardTitle>
              <CardDescription>No conferences are currently accepting submissions</CardDescription>
            </CardHeader>
            <CardContent className="py-8">
              <p className="text-center text-gray-500 mb-6">
                There are no conferences currently accepting presentation submissions.
                Please check back later or contact the conference organizers.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => router.push("/presenter/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Submit a Presentation</CardTitle>
            <CardDescription>
              Complete the form below to submit your presentation for review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="conferenceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conference</FormLabel>
                      <Select 
                        onValueChange={(value) => handleConferenceChange(value)} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a conference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {conferences.map((conference) => (
                            <SelectItem key={conference.id} value={conference.id.toString()}>
                              {conference.name} (Deadline: {new Date(conference.submissionDeadline).toLocaleDateString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedConference && (
                  <FormField
                    control={form.control}
                    name="presentationTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Presentation Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select presentation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {presentationTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name} ({type.defaultDuration} min)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presentation Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter the title of your presentation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="abstract"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abstract</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Provide a detailed abstract of your presentation" 
                          className="min-h-32"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keywords</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter keywords separated by commas (e.g., AI, Machine Learning, Data Science)" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="affiliations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affiliations (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter affiliations separated by commas (e.g., MIT, Google Research)" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requested Duration (Optional, in minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          placeholder="Enter requested duration in minutes (if different from default)" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSubmit(form.getValues(), true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save as Draft
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit Presentation
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}