"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { createAuthenticatedApi } from "@/lib/utils";
import { toast } from "sonner";

interface PresentationDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  presentation?: any;
  onSuccess: () => void;
}

export default function PresentationDialog({
  open,
  onClose,
  sessionId,
  presentation,
  onSuccess
}: PresentationDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    duration: 15,
    keywords: [] as string[],
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (presentation) {
      setFormData({
        title: presentation.title || "",
        abstract: presentation.abstract || "",
        duration: presentation.duration || 15,
        keywords: presentation.keywords || [],
      });
    } else {
      setFormData({
        title: "",
        abstract: "",
        duration: 15,
        keywords: [],
      });
    }
  }, [presentation]);

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.abstract) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      
      if (presentation) {
        await api.put(`/api/presentations/${presentation.id}`, {
          ...formData,
          sectionId: sessionId
        });
        toast.success("Presentation updated successfully");
      } else {
        await api.post("/api/presentations", {
          ...formData,
          sectionId: sessionId
        });
        toast.success("Presentation created successfully");
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving presentation:", error);
      toast.error(error.response?.data?.message || "Failed to save presentation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle>
            {presentation ? "Edit Presentation" : "Add New Presentation"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Presentation title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="abstract">
              Abstract <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="abstract"
              value={formData.abstract}
              onChange={(e) => setFormData(prev => ({ ...prev, abstract: e.target.value }))}
              placeholder="Presentation abstract"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="5"
              max="180"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Keywords</Label>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Add keyword"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addKeyword}
                disabled={!newKeyword.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {formData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary-700 text-white hover:bg-primary-800"
          >
            {loading ? "Saving..." : presentation ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}