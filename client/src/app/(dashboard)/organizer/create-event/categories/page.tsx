"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, CheckCircle, Tag } from "lucide-react";
import { toast } from "sonner";
import { createAuthenticatedApi } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function SetupCategoriesPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get('step');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [presentationTypes, setPresentationTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#3B82F6' });
  const [typeForm, setTypeForm] = useState({ 
    name: '', 
    description: '', 
    defaultDuration: 20, 
    allowsQA: true, 
    qaDuration: 5 
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      
      // UPDATED: Use /events/ endpoints
      const [categoriesRes, typesRes] = await Promise.all([
        api.get(`/events/${id}/categories`).catch(() => ({ data: [] })),
        api.get(`/events/${id}/presentation-types`).catch(() => ({ data: [] }))
      ]);
      
      setCategories(categoriesRes.data || []);
      setPresentationTypes(typesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const api = await createAuthenticatedApi();
      const response = await api.post(`/events/${id}/categories`, {
        ...categoryForm,
        order: categories.length + 1
      });
      
      setCategories(prev => [...prev, response.data]);
      setCategoryForm({ name: '', description: '', color: '#3B82F6' });
      setShowCategoryForm(false);
      toast.success('Category created successfully!');
      
      // ✅ UPDATE WORKFLOW when first category is created
      if (categories.length === 0) {
        try {
          const api = await createAuthenticatedApi();
          await api.put(`/events/${id}/workflow`, {
            workflowStep: 3,
            workflowStatus: 'in_progress'
          });
        } catch (error) {
          console.error('Error updating workflow:', error);
        }
      }
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const handleCreatePresentationType = async () => {
    if (!typeForm.name.trim()) {
      toast.error('Presentation type name is required');
      return;
    }

    try {
      const api = await createAuthenticatedApi();
      const response = await api.post(`/events/${id}/presentation-types`, {
        ...typeForm,
        minDuration: typeForm.defaultDuration - 5,
        maxDuration: typeForm.defaultDuration + 10,
        order: presentationTypes.length + 1
      });
      
      setPresentationTypes(prev => [...prev, response.data]);
      setTypeForm({ name: '', description: '', defaultDuration: 20, allowsQA: true, qaDuration: 5 });
      setShowTypeForm(false);
      toast.success('Presentation type created successfully!');
      
      // ✅ UPDATE WORKFLOW when first type is created
      if (presentationTypes.length === 0) {
        try {
          const api = await createAuthenticatedApi();
          await api.put(`/events/${id}/workflow`, {
            workflowStep: 3,
            workflowStatus: 'in_progress'
          });
        } catch (error) {
          console.error('Error updating workflow:', error);
        }
      }
    } catch (error) {
      toast.error('Failed to create presentation type');
    }
  };

  const handleContinueToNextStep = async () => {
    try {
      const api = await createAuthenticatedApi();
      
      // ✅ UPDATE WORKFLOW when moving to publish step
      await api.put(`/events/${id}/workflow`, {
        workflowStep: 4,
        workflowStatus: 'ready_to_publish'
      });

      toast.success('Moving to publish step...');
      router.push(`/organizer/events/${id}/setup/publish?step=4`);
    } catch (error) {
      console.error('Error updating workflow:', error);
      router.push(`/organizer/events/${id}/setup/publish?step=4`);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto py-8 px-4">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/organizer/events/${id}/setup/sessions?step=2`)}
            className="p-0 h-8 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Sessions
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Setup Categories & Types</h1>
            <p className="text-gray-600 mt-2">
              Create categories and presentation types to organize your conference content.
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Step {step} of 5
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Categories</h2>
          
          {categories.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Created Categories ({categories.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center gap-2 p-2 border rounded">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!showCategoryForm ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Tag className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-semibold mb-2">Create Categories</h3>
                <p className="text-gray-500 text-center text-sm mb-4">
                  Group presentations by topic or theme
                </p>
                <Button onClick={() => setShowCategoryForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="categoryName">Name *</Label>
                  <Input
                    id="categoryName"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Machine Learning"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryDesc">Description</Label>
                  <Textarea
                    id="categoryDesc"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this category..."
                  />
                </div>
                <div>
                  <Label htmlFor="categoryColor">Color</Label>
                  <Input
                    id="categoryColor"
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateCategory}>Create</Button>
                  <Button variant="outline" onClick={() => setShowCategoryForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Presentation Types Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Presentation Types</h2>
          
          {presentationTypes.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Created Types ({presentationTypes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {presentationTypes.map((type) => (
                    <div key={type.id} className="p-2 border rounded">
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-gray-600">
                        {type.defaultDuration} min
                        {type.allowsQA && ` + ${type.qaDuration} min Q&A`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!showTypeForm ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Tag className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-semibold mb-2">Create Presentation Types</h3>
                <p className="text-gray-500 text-center text-sm mb-4">
                  Define different types of presentations
                </p>
                <Button onClick={() => setShowTypeForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Type
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Presentation Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="typeName">Name *</Label>
                  <Input
                    id="typeName"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Research Paper"
                  />
                </div>
                <div>
                  <Label htmlFor="typeDesc">Description</Label>
                  <Textarea
                    id="typeDesc"
                    value={typeForm.description}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this type..."
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Default Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={typeForm.defaultDuration}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, defaultDuration: parseInt(e.target.value) || 20 }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreatePresentationType}>Create</Button>
                  <Button variant="outline" onClick={() => setShowTypeForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => router.push(`/organizer/events/${id}/setup/sessions?step=2`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/organizer/events/${id}`)}>
            Skip to Event
          </Button>
          
          <Button onClick={handleContinueToNextStep}>
            Continue to Publish
            <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}