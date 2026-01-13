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
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Download, Eye, EyeOff, Pencil, ChevronRight } from "lucide-react";

interface Material {
  id: number;
  conferenceId: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  isPublic: boolean;
}

const ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'zip'];

export default function MaterialsPage() {
  const params = useParams();
  const conferenceId = Number(params?.id);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Form state
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    fileUrl: "",
    fileType: "",
    isPublic: true,
  });

  const fetchMaterials = useCallback(async () => {
    if (!conferenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORGANIZER.MATERIALS(conferenceId));
      setMaterials(res.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const resetForm = () => {
    setFormValues({
      title: "",
      description: "",
      fileUrl: "",
      fileType: "",
      isPublic: true,
    });
    setEditMaterial(null);
  };

  const openEditDialog = (material: Material) => {
    setEditMaterial(material);
    setFormValues({
      title: material.title,
      description: material.description || "",
      fileUrl: material.fileUrl,
      fileType: material.fileType,
      isPublic: material.isPublic,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formValues.title.trim()) {
      toast.error("Material title is required");
      return;
    }
    if (!editMaterial && !formValues.fileUrl.trim()) {
      toast.error("File URL is required");
      return;
    }
    if (!editMaterial && !formValues.fileType.trim()) {
      toast.error("File type is required");
      return;
    }

    setSaving(true);
    try {
      if (editMaterial) {
        // Update existing material
        await apiClient.put(API_ENDPOINTS.ORGANIZER.MATERIAL(conferenceId, editMaterial.id), {
          title: formValues.title,
          description: formValues.description || null,
          isPublic: formValues.isPublic,
        });
        toast.success("Material updated");
      } else {
        // Create new material
        await apiClient.post(API_ENDPOINTS.ORGANIZER.MATERIALS(conferenceId), {
          title: formValues.title,
          description: formValues.description || null,
          fileUrl: formValues.fileUrl,
          fileType: formValues.fileType,
          isPublic: formValues.isPublic,
        });
        toast.success("Material added");
      }
      setDialogOpen(false);
      resetForm();
      fetchMaterials();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (materialId: number) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
    setDeleting(materialId);
    try {
      await apiClient.delete(API_ENDPOINTS.ORGANIZER.MATERIAL(conferenceId, materialId));
      toast.success("Material deleted");
      fetchMaterials();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setDeleting(null);
    }
  };

  const getFileIcon = (_fileType: string) => {
    return <FileText className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!conferenceId) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <a href="../website" className="hover:text-foreground transition-colors">Website</a>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Downloads & Materials</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Materials</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage downloadable resources for your conference.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editMaterial ? "Edit Material" : "Add Material"}</DialogTitle>
              <DialogDescription>
                {editMaterial
                  ? "Update the material details below."
                  : "Add a new material by providing a title and file URL."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formValues.title}
                  onChange={(e) => setFormValues((v) => ({ ...v, title: e.target.value }))}
                  placeholder="Conference Brochure"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formValues.description}
                  onChange={(e) => setFormValues((v) => ({ ...v, description: e.target.value }))}
                  placeholder="Optional description of the material"
                  rows={3}
                />
              </div>
              {!editMaterial && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fileUrl">File URL *</Label>
                    <Input
                      id="fileUrl"
                      value={formValues.fileUrl}
                      onChange={(e) => setFormValues((v) => ({ ...v, fileUrl: e.target.value }))}
                      placeholder="https://example.com/file.pdf"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the URL where the file is hosted (e.g., cloud storage link).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fileType">File Type *</Label>
                    <Input
                      id="fileType"
                      value={formValues.fileType}
                      onChange={(e) => setFormValues((v) => ({ ...v, fileType: e.target.value.toLowerCase() }))}
                      placeholder="pdf"
                    />
                    <p className="text-xs text-muted-foreground">
                      Allowed types: {ALLOWED_FILE_TYPES.join(", ")}
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={formValues.isPublic}
                  onCheckedChange={(checked) => setFormValues((v) => ({ ...v, isPublic: checked }))}
                />
                <Label htmlFor="isPublic">Publicly visible</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : editMaterial ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-muted-foreground">Loading materials...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && materials.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No materials uploaded yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Add Material&quot; to upload your first file.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && materials.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>{getFileIcon(material.fileType)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{material.title}</p>
                      {material.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {material.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{material.fileType.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    {material.isPublic ? (
                      <Badge variant="default" className="flex items-center gap-1 w-fit">
                        <Eye className="h-3 w-3" /> Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <EyeOff className="h-3 w-3" /> Private
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(material.uploadedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(material)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(material.id)}
                        disabled={deleting === material.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
