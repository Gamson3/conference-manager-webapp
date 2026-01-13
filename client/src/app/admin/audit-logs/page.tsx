"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Calendar,
  Search,
} from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: number;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  admin: {
    id: number;
    name: string;
    email: string;
  };
  impersonatedUser: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const actionTypes = [
  "DELETE_USER",
  "UPDATE_USER_ROLE",
  "IMPERSONATE_USER",
  "CREATE_CONFERENCE",
  "UPDATE_CONFERENCE",
  "DELETE_CONFERENCE",
  "PUBLISH_CONFERENCE",
  "UNPUBLISH_CONFERENCE",
  "DELETE_SUBMISSION",
  "UPDATE_SUBMISSION_STATUS",
  "DELETE_PRESENTATION",
  "UPDATE_PRESENTATION",
  "BULK_DELETE",
  "EXPORT_DATA",
];

const entityTypes = [
  "User",
  "Conference",
  "Submission",
  "Presentation",
  "Schedule",
  "Session",
  "System",
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["auditLogs", page, limit, actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (actionFilter && actionFilter !== "all") params.append("action", actionFilter);
      if (entityFilter && entityFilter !== "all") params.append("entityType", entityFilter);

      const response = await apiClient.get(
        `/api/admin/audit-logs?${params.toString()}`
      );
      return response.data as AuditLogsResponse;
    },
  });

  const filteredLogs = data?.logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.admin.name.toLowerCase().includes(search) ||
      log.admin.email.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search)
    );
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes("DELETE")) return "destructive";
    if (action.includes("UPDATE") || action.includes("PUBLISH"))
      return "default";
    if (action.includes("IMPERSONATE")) return "secondary";
    return "outline";
  };

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">
              Error loading audit logs: {(error as Error).message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete history of all administrative actions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="w-[200px]">
            <label className="text-sm font-medium mb-2 block">Action</label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypes.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[200px]">
            <label className="text-sm font-medium mb-2 block">
              Entity Type
            </label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entityTypes.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <label className="text-sm font-medium mb-2 block">Per Page</label>
            <Select
              value={limit.toString()}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {data?.pagination.total || 0} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Loading audit logs...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs && filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <>
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === log.id ? null : log.id
                            )
                          }
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(
                                new Date(log.createdAt),
                                "MMM d, yyyy HH:mm"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{log.admin.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {log.admin.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeColor(log.action)}>
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.entityType}</p>
                              {log.entityId && (
                                <p className="text-sm text-muted-foreground">
                                  ID: {log.entityId}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.impersonatedUser && (
                              <div className="text-sm">
                                <p className="font-medium">Impersonated:</p>
                                <p className="text-muted-foreground">
                                  {log.impersonatedUser.name}
                                </p>
                              </div>
                            )}
                            {log.metadata && (
                              <p className="text-sm text-muted-foreground">
                                Click to view details
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.ipAddress || "N/A"}
                          </TableCell>
                        </TableRow>
                        {expandedRow === log.id && log.metadata && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30">
                              <div className="p-4">
                                <h4 className="font-semibold mb-2">
                                  Metadata:
                                </h4>
                                <pre className="bg-background p-4 rounded-md overflow-auto text-xs">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                                {log.userAgent && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium">
                                      User Agent:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {log.userAgent}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data && data.pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(data.pagination.pages, p + 1))
                      }
                      disabled={page === data.pagination.pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
