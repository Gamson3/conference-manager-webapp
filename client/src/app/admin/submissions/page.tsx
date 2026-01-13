"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import apiClient, { handleApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  id: number;
  title: string;
  status: string;
  submittedAt: string | null;
  conference: {
    id: number;
    name: string;
  };
  author: {
    name: string;
    email: string;
  };
}

export default function AdminSubmissionsPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conferenceFilter, setConferenceFilter] = useState('all');
  const [deleteSubId, setDeleteSubId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const { data: submissions, isLoading } = useQuery<Submission[]>({
    queryKey: ['admin', 'submissions', statusFilter, conferenceFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (conferenceFilter !== 'all') params.set('conferenceId', conferenceFilter);
      if (search) params.set('search', search);
      
      const response = await apiClient.get(`/api/admin/submissions?${params.toString()}`);
      return response.data.submissions || response.data;
    },
    enabled: isAuthenticated && isAdmin,
  });

  const { data: conferences } = useQuery({
    queryKey: ['admin', 'conferences-list'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/conferences');
      return response.data.conferences || response.data;
    },
    enabled: isAuthenticated && isAdmin,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiClient.patch(`/api/admin/submissions/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Submission status updated successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'submissions'] });
    },
    onError: (e: unknown) => {
      toast.error(handleApiError(e));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/admin/submissions/${id}`);
    },
    onSuccess: () => {
      toast.success('Submission deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'submissions'] });
      setDeleteSubId(null);
    },
    onError: (e: unknown) => {
      toast.error(handleApiError(e));
    }
  });

  if (authLoading || !isAdmin) return null;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Submissions</h1>
        <p className="text-muted-foreground mt-2">Review and manage submissions across all conferences</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search submissions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={conferenceFilter} onValueChange={setConferenceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Conferences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conferences</SelectItem>
            {conferences?.map((conf: { id: number; name: string }) => (
              <SelectItem key={conf.id} value={conf.id.toString()}>
                {conf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Conference</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading submissions...</TableCell>
              </TableRow>
            ) : !submissions || submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">No submissions found</TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.id}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">
                    {sub.title}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{sub.conference.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{sub.author.name}</div>
                      <div className="text-muted-foreground text-xs">{sub.author.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sub.status}
                      onValueChange={(status) => statusMutation.mutate({ id: sub.id, status })}
                      disabled={statusMutation.isPending}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Not submitted'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/organizer/conferences/${sub.conference.id}/submissions/${sub.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteSubId(sub.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteSubId !== null} onOpenChange={() => setDeleteSubId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
              The submission and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubId && deleteMutation.mutate(deleteSubId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Submission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
