"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileText,
  Users,
  Calendar,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  Loader2,
  Package,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const exportTypes = [
  {
    id: "participants",
    title: "Participants",
    description: "Export all registered participants with contact info and custom responses",
    icon: Users,
    color: "from-green-500/20 to-green-600/10",
    iconColor: "text-green-500",
    fields: ["Name", "Email", "Organization", "Role", "Status", "Registration Date", "Custom Questions"],
  },
  {
    id: "submissions",
    title: "Abstract Submissions",
    description: "Export all submissions with author details, status, and review data",
    icon: FileText,
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-500",
    fields: ["Title", "Author", "Co-Authors", "Category", "Type", "Status", "Keywords", "Abstract"],
  },
  {
    id: "schedule",
    title: "Program Schedule",
    description: "Export the complete conference schedule with sessions and presentations",
    icon: Calendar,
    color: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-500",
    fields: ["Day", "Session", "Time", "Room", "Presentation", "Speaker", "Duration"],
  },
];

export default function ExportsPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [includeCustomFields, setIncludeCustomFields] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exporting, setExporting] = useState<string | null>(null);
  const [recentExports, setRecentExports] = useState<Array<{ type: string; time: Date; format: string }>>([]);

  const handleExport = async (type: string) => {
    if (!conferenceId) return;
    setExporting(type);

    try {
      let response: { data: BlobPart };
      let filename: string;

      switch (type) {
        case "participants":
          response = await apiClient.post(
            API_ENDPOINTS.ORGANIZER.PARTICIPANTS_EXPORT(conferenceId),
            { status: statusFilter !== "all" ? statusFilter : undefined },
            { responseType: "blob" }
          );
          filename = `participants-${conferenceId}.${format}`;
          break;

        case "submissions":
          const submissionsUrl =
            format === "csv"
              ? API_ENDPOINTS.ORGANIZER.SUBMISSIONS_EXPORT(conferenceId) + "?format=csv"
              : API_ENDPOINTS.ORGANIZER.SUBMISSIONS_EXPORT(conferenceId) + "?format=json";
          response = await apiClient.get(submissionsUrl, { responseType: "blob" });
          filename = `submissions-${conferenceId}.${format}`;
          break;

        case "schedule":
          // Build schedule export from days/sessions/presentations
          const [daysRes, sessionsRes] = await Promise.all([
            apiClient.get(API_ENDPOINTS.ORGANIZER.DAYS(conferenceId)),
            apiClient.get(API_ENDPOINTS.ORGANIZER.SESSIONS(conferenceId)),
          ]);

          const scheduleData = {
            days: daysRes.data,
            sessions: sessionsRes.data,
            exportedAt: new Date().toISOString(),
          };

          if (format === "json") {
            const blob = new Blob([JSON.stringify(scheduleData, null, 2)], {
              type: "application/json",
            });
            response = { data: blob };
          } else {
            // Convert to CSV
            let csv = "Day,Date,Session,Type,Start Time,End Time,Room,Capacity\n";
            for (const session of sessionsRes.data) {
              const day = daysRes.data.find((d: { id: number }) => d.id === session.dayId);
              csv += `"${day?.name || ""}","${day?.date || ""}","${session.name}","${session.type}","${session.startTime || ""}","${session.endTime || ""}","${session.room || ""}","${session.capacity || ""}"\n`;
            }
            const blob = new Blob([csv], { type: "text/csv" });
            response = { data: blob };
          }
          filename = `schedule-${conferenceId}.${format}`;
          break;

        default:
          throw new Error("Invalid export type");
      }

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Track export
      setRecentExports((prev) => [
        { type, time: new Date(), format },
        ...prev.slice(0, 4),
      ]);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    setExporting("all");
    try {
      for (const type of ["participants", "submissions", "schedule"]) {
        await handleExport(type);
      }
    } finally {
      setExporting(null);
    }
  };

  if (!conferenceId) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Download className="h-6 w-6 text-primary" />
          Data Exports
        </h1>
        <p className="text-muted-foreground mt-1">
          Export participants, abstracts, and schedule data in various formats
        </p>
      </div>

      {/* Quick Export All */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-background border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Export All Data</h3>
                <p className="text-sm text-muted-foreground">
                  Download all conference data in one click
                </p>
              </div>
            </div>
            <Button onClick={handleExportAll} disabled={!!exporting}>
              {exporting === "all" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Settings</CardTitle>
          <CardDescription>Configure your export preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <Label>File Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as "csv" | "json")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV (Excel)
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status Filter (Participants)</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="registered">Registered Only</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted Only</SelectItem>
                  <SelectItem value="canceled">Canceled Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="customFields"
                checked={includeCustomFields}
                onCheckedChange={(checked) => setIncludeCustomFields(!!checked)}
              />
              <Label htmlFor="customFields" className="text-sm">
                Include custom registration fields
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Types */}
      <div className="grid gap-4 md:grid-cols-3">
        {exportTypes.map((type) => (
          <Card
            key={type.id}
            className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
              selectedType === type.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedType(type.id)}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-50`} />
            <CardContent className="relative pt-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-background/80 ${type.iconColor}`}>
                  <type.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{type.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Included fields:</p>
                <div className="flex flex-wrap gap-1">
                  {type.fields.slice(0, 4).map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                  {type.fields.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{type.fields.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                className="w-full mt-4"
                variant={selectedType === type.id ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(type.id);
                }}
                disabled={!!exporting}
              >
                {exporting === type.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {type.title}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Exports */}
      {recentExports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Exports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentExports.map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{exp.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.time.toLocaleTimeString()} • {exp.format.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
