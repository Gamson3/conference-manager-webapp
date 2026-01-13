"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Eye, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Presentation {
  id: number;
  title: string;
  duration: number | null;
  section: {
    id: number;
    name: string;
    startTime: string | null;
    conference: {
      id: number;
      name: string;
    };
  };
  authors: Array<{
    id: number;
    authorName: string;
    authorEmail: string | null;
    isPresenter: boolean;
  }>;
}

export default function AdminPresentationsPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [conferenceFilter, setConferenceFilter] = useState('all');
  const [deletePresId, setDeletePresId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const { data: presentations, isLoading } = useQuery<Presentation[]>({
    queryKey: ['admin', 'presentations', conferenceFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (conferenceFilter !== 'all') params.set('conferenceId', conferenceFilter);
      if (search) params.set('search', search);
      
      const response = await apiClient.get(`/api/admin/presentations?${params.toString()}`);
      return response.data.presentations || response.data;
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/admin/presentations/${id}`);
    },
    onSuccess: () => {
      toast.success('Presentation deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'presentations'] });
      setDeletePresId(null);
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError?.response?.data?.message || 'Failed to delete presentation');
    }
  });

  if (authLoading || !isAdmin) return null;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Presentations</h1>
        <p className="text-muted-foreground mt-2">View, edit, and manage presentations across all conferences</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search presentations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
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
              <TableHead>Section</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Authors</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">Loading presentations...</TableCell>
              </TableRow>
            ) : !presentations || presentations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">No presentations found</TableCell>
              </TableRow>
            ) : (
              presentations.map((pres) => (
                <TableRow key={pres.id}>
                  <TableCell>{pres.id}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">
                    {pres.title}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{pres.section.conference.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{pres.section.name}</Badge>
                  </TableCell>
                  <TableCell>{pres.duration || 'N/A'} min</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {pres.authors.map(a => a.authorName).join(', ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {pres.section.startTime ? (
                      <div className="text-sm">
                        <div className="text-muted-foreground text-xs">{new Date(pres.section.startTime).toLocaleString()}</div>
                      </div>
                    ) : (
                      <Badge variant="secondary">Unscheduled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/organizer/conferences/${pres.section.conference.id}/presentations`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/conferences/${pres.section.conference.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletePresId(pres.id)}
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
      <AlertDialog open={deletePresId !== null} onOpenChange={() => setDeletePresId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Presentation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this presentation? This action cannot be undone.
              The presentation and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePresId && deleteMutation.mutate(deletePresId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Presentation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
