"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PresenterDashboardData {
  stats: {
    totalSubmissions: number;
    approvedPresentations: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    scheduledPresentations: number;
    totalMaterials: number;
  };
  upcomingPresentations: any[];
  submissions: any[];
  conferences: any[];
  presenter: any;
}

export default function PresenterDashboard() {
  const [data, setData] = useState<PresenterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const session = await fetchAuthSession();
        if (!session.tokens?.idToken) {
          throw new Error('Not authenticated');
        }
        
        const api = axios.create({
          baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002',
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`
          }
        });
        
        const response = await api.get('/api/presenter/dashboard');
        setData(response.data);
      } catch (err: any) {
        console.error('Failed to fetch presenter dashboard:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Presenter Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Presenter Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error: {error}</p>
            <button 
              onClick={() => router.refresh()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  const { stats, upcomingPresentations, submissions } = data;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Presenter Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-muted-foreground">Total Submissions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.approvedPresentations}</div>
            <p className="text-muted-foreground">Approved Presentations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.scheduledPresentations}</div>
            <p className="text-muted-foreground">Scheduled Presentations</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Upcoming Presentations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upcoming Presentations</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingPresentations.length === 0 ? (
            <p className="text-muted-foreground">No upcoming presentations</p>
          ) : (
            <div className="space-y-4">
              {upcomingPresentations.map((presentation) => (
                <div 
                  key={presentation.id} 
                  className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/presenter/submissions/${presentation.id}`)}
                >
                  <h3 className="font-medium">{presentation.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {presentation.section?.conference?.name} • {presentation.section?.startTime && 
                      new Date(presentation.section.startTime).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-muted-foreground">No submissions yet</p>
          ) : (
            <div className="space-y-4">
              {submissions.slice(0, 5).map((submission) => (
                <div 
                  key={submission.id} 
                  className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/presenter/submissions/${submission.id}`)}
                >
                  <div className="flex justify-between">
                    <h3 className="font-medium">{submission.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(submission.reviewStatus)}`}>
                      {formatStatus(submission.reviewStatus)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Submitted to: {submission.section?.conference?.name}
                  </p>
                </div>
              ))}
              
              {submissions.length > 5 && (
                <button 
                  className="text-blue-500 hover:underline w-full text-center mt-2"
                  onClick={() => router.push('/presenter/submissions')}
                >
                  View all {submissions.length} submissions
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'REVISION_REQUESTED':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}