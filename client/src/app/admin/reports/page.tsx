"use client";

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, FileDown, TrendingUp, Users, Calendar, FileText } from 'lucide-react';

interface ReportData {
  totalUsers: number;
  totalConferences: number;
  totalSubmissions: number;
  totalPresentations: number;
  userGrowth: number;
  conferenceGrowth: number;
  averageSubmissionsPerConference: number;
  averagePresentationsPerConference: number;
}

export default function AdminReportsPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const { data: reportData } = useQuery<ReportData>({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/reports');
      return response.data;
    },
    enabled: isAuthenticated && isAdmin,
  });

  const handleExportCSV = async (type: string) => {
    try {
      const response = await apiClient.get(`/api/admin/export/${type}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-export-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (authLoading || !isAdmin) return null;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">System insights and data export</p>
      </div>

      {reportData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +{reportData.userGrowth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conference Activity</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalConferences}</div>
              <p className="text-xs text-muted-foreground">
                +{reportData.conferenceGrowth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Submissions</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reportData.averageSubmissionsPerConference.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">Per conference</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Presentations</CardTitle>
              <BarChart className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reportData.averagePresentationsPerConference.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">Per conference</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Export Users
            </CardTitle>
            <CardDescription>Download complete user database</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleExportCSV('users')} className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              Export Users CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Export Conferences
            </CardTitle>
            <CardDescription>Download all conference data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleExportCSV('conferences')} className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              Export Conferences CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Submissions
            </CardTitle>
            <CardDescription>Download submission records</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleExportCSV('submissions')} className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              Export Submissions CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Platform performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Users</span>
                <span className="text-sm text-muted-foreground">{reportData?.totalUsers || 0}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Conferences</span>
                <span className="text-sm text-muted-foreground">{reportData?.totalConferences || 0}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Submissions</span>
                <span className="text-sm text-muted-foreground">{reportData?.totalSubmissions || 0}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Presentations</span>
                <span className="text-sm text-muted-foreground">{reportData?.totalPresentations || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
