"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeftIcon, EditIcon, CalendarIcon, UsersIcon, FileIcon } from "lucide-react";
import MaterialUploader from '@/components/presenter/MaterialUploader';
import MaterialsList from '@/components/presenter/MaterialsList';

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;
  
  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      setIsLoading(true);
      const api = await createAuthenticatedApi();
      const response = await api.get(`/api/submissions/${submissionId}`);
      setSubmission(response.data);
    } catch (error: any) {
      console.error('Error fetching submission:', error);
      toast.error('Failed to load submission details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Under Review</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 w-1/3 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Submission Not Found</h2>
            <Button onClick={() => router.push('/presenter/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-6 pl-0"
        onClick={() => router.push('/presenter/dashboard')}
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{submission.title}</h1>
          <div className="flex items-center gap-4">
            {getStatusBadge(submission.reviewStatus)}
            <span className="text-gray-500">
              Conference: {submission.section?.conference.name}
            </span>
          </div>
        </div>
        <Button variant="outline">
          <EditIcon className="h-4 w-4 mr-2" />
          Edit Submission
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="authors">Authors</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Abstract */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Abstract</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{submission.abstract}</p>
              </div>

              {/* Keywords */}
              {submission.keywords && submission.keywords.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {submission.keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="outline">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Category and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submission.category && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Category</h3>
                    <p className="text-lg">{submission.category.name}</p>
                  </div>
                )}
                {submission.presentationType && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Presentation Type</h3>
                    <p className="text-lg">{submission.presentationType.name}</p>
                  </div>
                )}
              </div>

              {/* Submission Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
                <p className="text-lg">
                  {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <div className="space-y-6">
            <MaterialUploader
              presentationId={submissionId}
              onUploadComplete={handleUploadComplete}
            />
            <MaterialsList
              presentationId={submissionId}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </TabsContent>

        {/* Authors Tab */}
        <TabsContent value="authors">
          <Card>
            <CardHeader>
              <CardTitle>Authors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submission.authors && submission.authors.length > 0 ? (
                  submission.authors.map((author: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{author.authorName}</h3>
                          <p className="text-gray-600">{author.authorEmail}</p>
                          {author.affiliation && (
                            <p className="text-sm text-gray-500">{author.affiliation}</p>
                          )}
                        </div>
                        {author.isPresenter && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Presenter
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">No authors listed</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}