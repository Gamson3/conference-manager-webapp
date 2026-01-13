"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  FileText,
  Eye,
  Plus,
  Settings,
  User,
  Mail,
  Building2,
  Briefcase,
  Phone,
  Hash,
  AlignLeft,
  ListOrdered,
  CheckSquare,
  Circle,
  Calendar,
  ArrowRight,
  Sparkles,
  Layers,
} from "lucide-react";

interface RegistrationQuestion {
  id: number;
  label: string;
  description: string | null;
  type: string;
  required: boolean;
  options: string[] | null;
  placeholder: string | null;
  category: string | null;
}

function normalizeOptions(raw: unknown): string[] | null {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return null;

    // Accept JSON-encoded arrays (common when stored as JSON in DB).
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }
      } catch {
        // fall through
      }
    }

    // Fallback: comma-separated list.
    const parts = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.length > 0 ? parts : null;
  }

  return null;
}

function normalizeRegistrationQuestions(raw: unknown): RegistrationQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
    .map((q): RegistrationQuestion | null => {
      const id = q.id;
      const label = q.label;
      const type = q.type;
      if (typeof id !== "number" || typeof label !== "string" || typeof type !== "string") return null;

      const description = typeof q.description === "string" ? q.description : null;
      const required = typeof q.required === "boolean" ? q.required : false;
      const options = normalizeOptions(q.options);
      const placeholder = typeof q.placeholder === "string" ? q.placeholder : null;
      const category = typeof q.category === "string" ? q.category : null;

      return {
        id,
        label,
        description,
        type,
        required,
        options,
        placeholder,
        category,
      };
    })
    .filter((q): q is RegistrationQuestion => q !== null);
}

const DEFAULT_FIELDS = [
  { label: "Full Name", icon: User, type: "text", required: true },
  { label: "Email Address", icon: Mail, type: "email", required: true },
  { label: "Organization", icon: Building2, type: "text", required: false },
  { label: "Job Title", icon: Briefcase, type: "text", required: false },
];

const typeIcons: Record<string, typeof AlignLeft> = {
  text: AlignLeft,
  textarea: AlignLeft,
  select: ListOrdered,
  multiselect: CheckSquare,
  checkbox: CheckSquare,
  radio: Circle,
  number: Hash,
  email: Mail,
  phone: Phone,
  date: Calendar,
};

export default function FormBuilderPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(true);

  const fetchQuestions = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.REGISTRATION_QUESTIONS(conferenceId));
      setQuestions(normalizeRegistrationQuestions(res.data));
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const renderFormField = (question: RegistrationQuestion) => {
    switch (question.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <Input
            type={question.type === "number" ? "number" : "text"}
            placeholder={question.placeholder || `Enter ${question.label.toLowerCase()}`}
            disabled
          />
        );
      
      case "textarea":
        return (
          <Textarea
            placeholder={question.placeholder || `Enter ${question.label.toLowerCase()}`}
            rows={3}
            disabled
          />
        );
      
      case "select":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={question.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {(Array.isArray(question.options) ? question.options : []).map((opt, i) => (
                <SelectItem key={i} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "multiselect":
      case "checkbox":
        return (
          <div className="space-y-2">
            {(Array.isArray(question.options) ? question.options : []).map((opt, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Checkbox id={`${question.id}-${i}`} disabled />
                <Label htmlFor={`${question.id}-${i}`} className="text-sm font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        );
      
      case "radio":
        return (
          <RadioGroup disabled>
            {(Array.isArray(question.options) ? question.options : []).map((opt, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${question.id}-${i}`} disabled />
                <Label htmlFor={`${question.id}-${i}`} className="text-sm font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case "date":
        return (
          <DateInput value="" onChange={() => {}} disabled />
        );
      
      default:
        return (
          <Input placeholder={question.placeholder || ""} disabled />
        );
    }
  };

  if (!conferenceId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Registration Form</h1>
          <p className="text-muted-foreground mt-1">
            Preview your registration form and manage custom questions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={previewMode ? "default" : "outline"}
            onClick={() => setPreviewMode(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Link href={`/organizer/conferences/${conferenceId}/registration/custom-questions`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Questions
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Form Preview</CardTitle>
                    <CardDescription>How the registration form will appear to attendees</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Live Preview
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Default User Fields */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span>Standard Fields (Auto-populated from user profile)</span>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {DEFAULT_FIELDS.map((field, i) => (
                    <div key={i} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <field.icon className="h-4 w-4 text-muted-foreground" />
                        {field.label}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        type={field.label.toLowerCase().includes("email") ? "email" : "text"}
                        placeholder={field.label}
                        disabled
                        className="bg-muted/50"
                      />
                    </div>
                  ))}
                </div>

                {questions.length > 0 && (
                  <>
                    <Separator />
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Plus className="h-4 w-4" />
                      <span>Custom Questions ({questions.length})</span>
                    </div>

                    <div className="space-y-6">
                      {questions.map((question) => {
                        const Icon = typeIcons[question.type] || AlignLeft;
                        return (
                          <div key={question.id} className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {question.label}
                              {question.required && <span className="text-destructive">*</span>}
                            </Label>
                            {question.description && (
                              <p className="text-sm text-muted-foreground">{question.description}</p>
                            )}
                            {renderFormField(question)}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <Separator />

                {/* Submit Button Preview */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" disabled>
                    Cancel
                  </Button>
                  <Button disabled>
                    Register for Conference
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Form Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Form Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Standard Fields</span>
                <Badge variant="secondary">{DEFAULT_FIELDS.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Custom Questions</span>
                <Badge variant="secondary">{questions.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Required Fields</span>
                <Badge variant="secondary">
                  {DEFAULT_FIELDS.filter(f => f.required).length + questions.filter(q => q.required).length}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-medium">
                <span>Total Fields</span>
                <Badge>{DEFAULT_FIELDS.length + questions.length}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/organizer/conferences/${conferenceId}/registration/custom-questions`}>
                <Button variant="outline" className="w-full justify-between">
                  Add Custom Questions
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/organizer/conferences/${conferenceId}/registration/settings`}>
                <Button variant="outline" className="w-full justify-between">
                  Registration Settings
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/organizer/conferences/${conferenceId}/registration/overview`}>
                <Button variant="outline" className="w-full justify-between">
                  View Registrations
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Keep the form concise - long forms reduce completion rates</p>
              <p>• Only mark fields as required if truly necessary</p>
              <p>• Use dropdown menus for questions with many options</p>
              <p>• Group related questions using categories</p>
            </CardContent>
          </Card>

          {/* No Questions State */}
          {questions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">No Custom Questions</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Add questions to collect additional information from registrants.
                </p>
                <Link href={`/organizer/conferences/${conferenceId}/registration/custom-questions`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Questions
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
