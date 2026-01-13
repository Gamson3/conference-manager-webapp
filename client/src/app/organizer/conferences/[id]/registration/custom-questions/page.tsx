"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import apiClient, { handleApiError } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  HelpCircle,
  AlignLeft,
  ListOrdered,
  CheckSquare,
  Circle,
  Hash,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  EyeOff,
  Utensils,
  Accessibility,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

type RegistrationQuestionValidation = Record<
  string,
  string | number | boolean | null | string[] | number[]
>;

interface RegistrationQuestion {
  id: number;
  conferenceId: number;
  label: string;
  description: string | null;
  type: string;
  required: boolean;
  options: string[] | null;
  order: number;
  placeholder: string | null;
  validation: RegistrationQuestionValidation | null;
  enabled: boolean;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

const QUESTION_TYPES = [
  { value: "text", label: "Short Text", icon: AlignLeft },
  { value: "textarea", label: "Long Text", icon: AlignLeft },
  { value: "select", label: "Dropdown", icon: ListOrdered },
  { value: "multiselect", label: "Multi-Select", icon: CheckSquare },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "radio", label: "Radio Buttons", icon: Circle },
  { value: "number", label: "Number", icon: Hash },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "date", label: "Date", icon: Calendar },
];

const CATEGORIES = [
  { value: "personal", label: "Personal Info", icon: HelpCircle },
  { value: "dietary", label: "Dietary", icon: Utensils },
  { value: "accessibility", label: "Accessibility", icon: Accessibility },
  { value: "other", label: "Other", icon: Tag },
];

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case "personal": return "bg-blue-500/10 text-blue-500";
    case "dietary": return "bg-green-500/10 text-green-500";
    case "accessibility": return "bg-purple-500/10 text-purple-500";
    default: return "bg-gray-500/10 text-gray-500";
  }
};

export default function CustomQuestionsPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<RegistrationQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  // Form state
  const [formValues, setFormValues] = useState({
    label: "",
    description: "",
    type: "text",
    required: false,
    options: "",
    placeholder: "",
    category: "",
    enabled: true,
  });

  const fetchQuestions = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.REGISTRATION_QUESTIONS(conferenceId));
      setQuestions(res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const resetForm = () => {
    setFormValues({
      label: "",
      description: "",
      type: "text",
      required: false,
      options: "",
      placeholder: "",
      category: "",
      enabled: true,
    });
    setEditQuestion(null);
  };

  const openEditDialog = (question: RegistrationQuestion) => {
    setEditQuestion(question);
    setFormValues({
      label: question.label,
      description: question.description || "",
      type: question.type,
      required: question.required,
      options: Array.isArray(question.options) ? question.options.join("\n") : "",
      placeholder: question.placeholder || "",
      category: question.category || "",
      enabled: question.enabled,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formValues.label.trim()) {
      toast.error("Question label is required");
      return;
    }

    const needsOptions = ["select", "multiselect", "radio", "checkbox"].includes(formValues.type);
    const optionsArray = formValues.options.split("\n").map((o) => o.trim()).filter(Boolean);
    
    if (needsOptions && optionsArray.length < 2) {
      toast.error("Please provide at least 2 options (one per line)");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: formValues.label,
        description: formValues.description || null,
        type: formValues.type,
        required: formValues.required,
        options: needsOptions ? optionsArray : null,
        placeholder: formValues.placeholder || null,
        category: formValues.category || null,
        enabled: formValues.enabled,
      };

      if (editQuestion) {
        await apiClient.put(API_ENDPOINTS.ORGANIZER.REGISTRATION_QUESTION(conferenceId, editQuestion.id), payload);
        toast.success("Question updated");
      } else {
        await apiClient.post(API_ENDPOINTS.ORGANIZER.REGISTRATION_QUESTIONS(conferenceId), payload);
        toast.success("Question created");
      }
      setDialogOpen(false);
      resetForm();
      fetchQuestions();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setDeleting(questionId);
    try {
      await apiClient.delete(API_ENDPOINTS.ORGANIZER.REGISTRATION_QUESTION(conferenceId, questionId));
      toast.success("Question deleted");
      fetchQuestions();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleEnabled = async (question: RegistrationQuestion) => {
    try {
      await apiClient.put(API_ENDPOINTS.ORGANIZER.REGISTRATION_QUESTION(conferenceId, question.id), {
        enabled: !question.enabled,
      });
      fetchQuestions();
      toast.success(question.enabled ? "Question disabled" : "Question enabled");
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const moveQuestion = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    setReordering(true);
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setQuestions(newQuestions);

    try {
      await apiClient.post(API_ENDPOINTS.ORGANIZER.REGISTRATION_QUESTIONS_REORDER(conferenceId), {
        questionIds: newQuestions.map((q) => q.id),
      });
    } catch (err) {
      toast.error(handleApiError(err));
      fetchQuestions();
    } finally {
      setReordering(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const typeInfo = QUESTION_TYPES.find((t) => t.value === type);
    const Icon = typeInfo?.icon || HelpCircle;
    return <Icon className="h-4 w-4" />;
  };

  if (!conferenceId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Custom Questions</h1>
          <p className="text-muted-foreground mt-1">
            Add custom fields to your registration form for dietary, accessibility, and other information.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
              <DialogDescription>
                Configure the question that will appear on the registration form.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="label">Question Label *</Label>
                <Input
                  id="label"
                  value={formValues.label}
                  onChange={(e) => setFormValues((v) => ({ ...v, label: e.target.value }))}
                  placeholder="e.g., Dietary Requirements"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Help Text</Label>
                <Textarea
                  id="description"
                  value={formValues.description}
                  onChange={(e) => setFormValues((v) => ({ ...v, description: e.target.value }))}
                  placeholder="Additional instructions for this field"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Question Type</Label>
                  <Select
                    value={formValues.type}
                    onValueChange={(value) => setFormValues((v) => ({ ...v, type: value }))}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="h-4 w-4" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formValues.category}
                    onValueChange={(value) => setFormValues((v) => ({ ...v, category: value }))}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <c.icon className="h-4 w-4" />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {["select", "multiselect", "radio", "checkbox"].includes(formValues.type) && (
                <div className="space-y-2">
                  <Label htmlFor="options">Options (one per line) *</Label>
                  <Textarea
                    id="options"
                    value={formValues.options}
                    onChange={(e) => setFormValues((v) => ({ ...v, options: e.target.value }))}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    rows={4}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  value={formValues.placeholder}
                  onChange={(e) => setFormValues((v) => ({ ...v, placeholder: e.target.value }))}
                  placeholder="e.g., Enter your response..."
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Required</Label>
                  <p className="text-xs text-muted-foreground">
                    Registrants must answer this question
                  </p>
                </div>
                <Switch
                  checked={formValues.required}
                  onCheckedChange={(checked) => setFormValues((v) => ({ ...v, required: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Show this question on the registration form
                  </p>
                </div>
                <Switch
                  checked={formValues.enabled}
                  onCheckedChange={(checked) => setFormValues((v) => ({ ...v, enabled: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : editQuestion ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      {!loading && questions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No custom questions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add questions to collect additional information from registrants.
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Question
            </Button>
          </CardContent>
        </Card>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <Card
              key={question.id}
              className={`transition-all ${!question.enabled ? "opacity-60" : ""} ${reordering ? "pointer-events-none" : ""}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Drag Handle & Reorder */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, "up")}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === questions.length - 1}
                      onClick={() => moveQuestion(index, "down")}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-medium">{question.label}</span>
                      {question.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                      {question.category && (
                        <Badge className={getCategoryColor(question.category)}>
                          {question.category}
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1 text-xs">
                        {getTypeIcon(question.type)}
                        {QUESTION_TYPES.find((t) => t.value === question.type)?.label || question.type}
                      </Badge>
                    </div>
                    {question.description && (
                      <p className="text-sm text-muted-foreground mb-2">{question.description}</p>
                    )}
                    {question.options && Array.isArray(question.options) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {question.options.slice(0, 5).map((opt, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {opt}
                          </Badge>
                        ))}
                        {question.options.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{question.options.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleEnabled(question)}
                      title={question.enabled ? "Disable" : "Enable"}
                    >
                      {question.enabled ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(question)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(question.id)}
                      disabled={deleting === question.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Add Templates */}
      {questions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Add Templates</CardTitle>
            <CardDescription>Common questions you can add with one click</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Dietary Requirements", type: "select", options: ["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free", "Other"], category: "dietary" },
                { label: "Accessibility Needs", type: "textarea", placeholder: "Please describe any accessibility requirements", category: "accessibility" },
                { label: "T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"], category: "other" },
                { label: "Emergency Contact", type: "text", placeholder: "Name and phone number", category: "personal", required: true },
              ].map((template, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={async () => {
                    try {
                      await apiClient.post(API_ENDPOINTS.ORGANIZER.REGISTRATION_QUESTIONS(conferenceId), template);
                      toast.success(`Added "${template.label}"`);
                      fetchQuestions();
                    } catch (err) {
                      toast.error(handleApiError(err));
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {template.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
