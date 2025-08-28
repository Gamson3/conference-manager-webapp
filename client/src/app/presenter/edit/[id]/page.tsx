"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { fetchAuthSession } from "aws-amplify/auth";
import axios from "axios";

// Define the schema for the form
const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  abstract: z.string().min(100, "Abstract must be at least 100 characters"),
  keywords: z.string().min(3, "Please provide at least 3 keywords separated by commas"),
  affiliations: z.string().optional(),
  duration: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditPresentation() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      abstract: "",
      keywords: "",
      affiliations: "",
      duration: "",
    },
  });

  useEffect(() => {
    const fetchPresentationDetails = async () => {
      try {
        setIsLoading(true);
        const session = await fetchAuthSession();
        
        if (!session.tokens?.idToken) {
          setError("Authentication error. Please login again.");
          return;
        }
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/presentations/${params.id}`, 
          {
            headers: {
              Authorization: `Bearer ${session.tokens.idToken.toString()}`
            }
          }
        );
        
        const presentation = response.data;
        
        // Check if the presentation is a draft (only drafts can be edited)
        if (presentation.status !== 'draft') {
          setError("Only draft presentations can be edited.");
          return;
        }
        
        // Set form values from the presentation data
        form.reset({
          title: presentation.title,
          abstract: presentation.abstract,
          keywords: presentation.keywords.join(", "),
          affiliations: presentation.affiliations?.join(", ") || "",
          duration: presentation.duration?.toString() || "",
        });
        
      } catch (error) {
        console.error("Error fetching presentation details:", error);
        setError("Failed to load presentation details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPresentationDetails();
  }, [params.id, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSaving(true);
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        toast.error("You must be logged in to save your presentation");
        return;
      }
      
      // Transform form data for API
      const submitData = {
        ...data,
        keywords: data.keywords.split(",").map(k => k.trim()),
        affiliations: data.affiliations ? data.affiliations.split(",").map(a => a.trim()) : [],
        duration: data.duration ? parseInt(data.duration) : undefined,
      };
      
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/presenter/presentations/${params.id}`, 
        submitData,
        {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`
          }
        }
      );
      
      toast.success("Your presentation has been updated successfully");
      
      // Redirect to the presentation detail page
      router.push(`/presenter/presentations/${params.id}`);
      
    } catch (error) {
      console.error("Error updating presentation:", error);
      toast.error("There was an error saving your presentation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Edit Presentation</CardTitle>
              <CardDescription>Loading presentation details...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={() => router.push("/presenter/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="pl-0 flex items-center gap-2"
            onClick={() => router.push(`/presenter/presentations/${params.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Presentation
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Edit Presentation</CardTitle>
            <CardDescription>
              Update your presentation details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          placeholder="Enter requested duration in minutes" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
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