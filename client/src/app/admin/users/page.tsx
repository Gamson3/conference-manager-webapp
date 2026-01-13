"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllUsers, changeUserRole, Role } from '@/features/admin/api/usersApi';
import type { User } from '@/types/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DangerDialog } from '@/components/admin/DangerDialog';
import { WarningDialog } from '@/components/admin/WarningDialog';
import { AdminActionMenu, AdminActionSection } from '@/components/admin/AdminActionMenu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, UserCog, Search, ChevronLeft, ChevronRight, Eye, Shield, Download, X } from 'lucide-react';
import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import { exportToCSV } from '@/lib/csvExport';

interface UserConsequences {
  conferences: number;
  submissions: number;
  presentations: number;
}

export default function AdminUsersPage() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [deleteUserName, setDeleteUserName] = useState('');
  const [deleteConsequences, setDeleteConsequences] = useState<UserConsequences | null>(null);
  const [impersonateUserId, setImpersonateUserId] = useState<number | null>(null);
  const [impersonateUserData, setImpersonateUserData] = useState<User | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !isAdmin) {
        const redirect = encodeURIComponent('/admin/users');
        router.replace(`/auth-check?redirect=${redirect}`);
      }
    }
  }, [loading, isAuthenticated, isAdmin, router]);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin','users'],
    queryFn: getAllUsers,
    enabled: isAuthenticated && isAdmin,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) => changeUserRole(userId, role),
    onSuccess: () => {
      toast.success('Role updated successfully');
      qc.invalidateQueries({ queryKey: ['admin','users'] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to update role');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.delete(API_ENDPOINTS.ADMIN.USER(userId));
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin','users'] });
      setDeleteUserId(null);
      setDeleteConsequences(null);
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError?.response?.data?.message || 'Failed to delete user');
    }
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiClient.post(`/api/admin/impersonate/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Impersonation started. You are now acting as this user.');
      localStorage.setItem('impersonating', 'true');
      localStorage.setItem('impersonatedUserId', impersonateUserId!.toString());
      window.location.href = '/';
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError?.response?.data?.message || 'Failed to impersonate user');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      await Promise.all(userIds.map(id => apiClient.delete(API_ENDPOINTS.ADMIN.USER(id))));
    },
    onSuccess: (_data, userIds) => {
      toast.success(`Deleted ${userIds.length} user(s) successfully`);
      qc.invalidateQueries({ queryKey: ['admin','users'] });
      setSelectedUsers([]);
      setBulkDeleteOpen(false);
    },
    onError: (error: Error) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError?.response?.data?.message || 'Failed to delete users');
    }
  });

  // Fetch consequences when user is selected for deletion
  useEffect(() => {
    if (deleteUserId) {
      apiClient.get(`/api/admin/consequences/user/${deleteUserId}`)
        .then(res => setDeleteConsequences(res.data))
        .catch(() => setDeleteConsequences(null));
    }
  }, [deleteUserId]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / limit);
  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'organizer': return 'default';
      default: return 'secondary';
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeleteUserId(user.id);
    setDeleteUserName(user.name);
  };

  const handleImpersonateUser = (user: User) => {
    setImpersonateUserId(user.id);
    setImpersonateUserData(user);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleBulkDelete = () => {
    if (selectedUsers.length === 0) return;
    setBulkDeleteOpen(true);
  };

  const handleExportSelected = () => {
    const usersToExport = selectedUsers.length > 0
      ? users.filter(u => selectedUsers.includes(u.id))
      : filteredUsers;

    const exportData = usersToExport.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));

    exportToCSV(exportData, 'users', {
      id: 'ID',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      createdAt: 'Created At',
    });

    toast.success(`Exported ${exportData.length} users to CSV`);
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
  };

  if (!isAdmin) {
    return null;
  }

  const allSelected = paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Manage Users
        </h1>
        <p className="text-muted-foreground mt-2">View all users, change roles, and manage accounts with full control</p>
      </div>

      <div className="flex gap-4 items-center justify-between flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {selectedUsers.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Clear ({selectedUsers.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
              >
                <Download className="h-4 w-4 mr-1" />
                Export Selected
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSelected}
          >
            <Download className="h-4 w-4 mr-1" />
            Export All
          </Button>
          <Select value={limit.toString()} onValueChange={(val) => {
            setLimit(Number(val));
            setPage(1);
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            {paginatedUsers.length} users displayed
            {selectedUsers.length > 0 && ` • ${selectedUsers.length} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all users"
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading users…</TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    {search ? 'No users match your search' : 'No users found'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u) => {
                  const isSelected = selectedUsers.includes(u.id);
                  const actions: AdminActionSection[] = [
                    {
                      label: "Actions",
                      actions: [
                        {
                          label: "View Profile",
                          icon: Eye,
                          onClick: () => router.push(`/admin/users/${u.id}`),
                        },
                        {
                          label: "Impersonate",
                          icon: UserCog,
                          onClick: () => handleImpersonateUser(u),
                        },
                      ]
                    },
                    {
                      label: "Danger Zone",
                      actions: [
                        {
                          label: "Delete User",
                          icon: Trash2,
                          onClick: () => handleDeleteUser(u),
                          variant: "danger",
                        },
                      ]
                    }
                  ];

                  return (
                    <TableRow key={u.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectUser(u.id, checked === true)}
                          aria-label={`Select ${u.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getUserInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">ID: {u.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(u.role)}>
                            {u.role}
                          </Badge>
                          <Select
                            value={u.role}
                            onValueChange={(val) => roleMutation.mutate({ userId: u.id, role: val as Role })}
                            disabled={roleMutation.isPending}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attendee">Attendee</SelectItem>
                              <SelectItem value="organizer">Organizer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AdminActionMenu sections={actions} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog with Consequences */}
      <DangerDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteUserId(null);
            setDeleteConsequences(null);
          }
        }}
        title="Delete User Account"
        description={`You are about to permanently delete ${deleteUserName}. This action cannot be undone.`}
        confirmText="Delete User"
        onConfirm={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
        requireTyping={deleteUserName}
        loading={deleteMutation.isPending}
        consequences={deleteConsequences ? [
          { label: "Conferences", count: deleteConsequences.conferences, description: "Conferences created by this user will be deleted" },
          { label: "Submissions", count: deleteConsequences.submissions, description: "All submissions authored by this user" },
          { label: "Presentations", count: deleteConsequences.presentations, description: "Presentation authorships will be removed" },
        ] : []}
      />

      {/* Impersonate Warning Dialog */}
      <WarningDialog
        open={impersonateUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setImpersonateUserId(null);
            setImpersonateUserData(null);
          }
        }}
        title="Impersonate User"
        description={`You are about to impersonate ${impersonateUserData?.name} (${impersonateUserData?.email}). This is a sensitive action that will be logged.`}
        confirmText="Start Impersonation"
        onConfirm={() => impersonateUserId && impersonateMutation.mutate(impersonateUserId)}
        requireCheckbox
        checkboxLabel="I understand that all actions will be logged and attributed to me"
        loading={impersonateMutation.isPending}
        impacts={impersonateUserData ? [
          {
            label: "Session Tracking",
            description: "Your impersonation session will be logged with IP address and timestamp"
          },
          {
            label: "Action Attribution",
            description: "All actions performed while impersonating will be recorded in the audit log"
          },
          {
            label: "Security Notice",
            description: `You will have ${impersonateUserData.role} level access. To exit impersonation, sign out and sign back in.`
          },
        ] : []}
      />
      {/* Bulk Delete Dialog */}
      <DangerDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedUsers.length} User(s)`}
        description={`You are about to permanently delete ${selectedUsers.length} selected user(s). This action cannot be undone and will cascade to all related data.`}
        confirmText="Delete Users"
        onConfirm={() => bulkDeleteMutation.mutate(selectedUsers)}
        requireTyping={`DELETE ${selectedUsers.length} USERS`}
        loading={bulkDeleteMutation.isPending}
        consequences={[
          { label: "Users", count: selectedUsers.length, description: "User accounts will be permanently deleted" },
          { label: "Warning", count: 0, description: "All conferences, submissions, and presentations created by these users will also be deleted" },
        ]}
      />    </div>
  );
}

