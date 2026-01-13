"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
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
import { Eye, Trash2, CheckCircle, XCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Conference {
  id: number;
  name: string;
  status: string;
  isPublic: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  creator?: {
    name: string;
    email: string;
  };
}

export default function AdminConferencesListPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfId, setDeleteConfId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  const { data: conferences, isLoading } = useQuery<Conference[]>({
    queryKey: ['admin', 'conferences', statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      
      const response = await apiClient.get(
        `${API_ENDPOINTS.ADMIN.CONFERENCES}?${params.toString()}`
      );
      return response.data.conferences || response.data;
    },
    enabled: isAuthenticated && isAdmin,
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(API_ENDPOINTS.ADMIN.CONFERENCE_PUBLISH(id));
    },
    onSuccess: () => {
      toast.success('Conference published successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'conferences'] });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError?.response?.data?.message || 'Failed to publish conference');
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(API_ENDPOINTS.ADMIN.CONFERENCE_UNPUBLISH(id));
    },
    onSuccess: () => {
      toast.success('Conference unpublished successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'conferences'] });
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError?.response?.data?.message || 'Failed to unpublish conference');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(API_ENDPOINTS.ADMIN.CONFERENCE(id));
    },
    onSuccess: () => {
      toast.success('Conference deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'conferences'] });
      setDeleteConfId(null);
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError?.response?.data?.message || 'Failed to delete conference');
    }
  });

  if (authLoading || !isAdmin) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'draft': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Conferences</h1>
        <p className="text-muted-foreground mt-2">Platform-wide conference management with full control</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search conferences..."
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
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Organizer</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading conferences...</TableCell>
              </TableRow>
            ) : !conferences || conferences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">No conferences found</TableCell>
              </TableRow>
            ) : (
              conferences.map((conf) => (
                <TableRow key={conf.id}>
                  <TableCell>{conf.id}</TableCell>
                  <TableCell className="font-medium">{conf.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(conf.status)}>
                      {conf.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {conf.isPublic ? (
                      <Badge variant="outline" className="bg-green-50">Public</Badge>
                    ) : (
                      <Badge variant="outline">Private</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(conf.startDate).toLocaleDateString()} - {new Date(conf.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{conf.creator?.name || 'N/A'}</div>
                      <div className="text-muted-foreground text-xs">{conf.creator?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {conf.status === 'draft' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => publishMutation.mutate(conf.id)}
                          disabled={publishMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Publish
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unpublishMutation.mutate(conf.id)}
                          disabled={unpublishMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Unpublish
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/organizer/conferences/${conf.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/conferences/${conf.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfId(conf.id)}
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
      <AlertDialog open={deleteConfId !== null} onOpenChange={() => setDeleteConfId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conference</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conference? This action cannot be undone.
              All conference data, submissions, presentations, and schedules will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfId && deleteMutation.mutate(deleteConfId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Conference
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
