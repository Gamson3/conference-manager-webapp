"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  FolderIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ArrowLeftIcon,
  SaveIcon,
  PresentationIcon,
  ClockIcon,
  TagIcon
} from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Category {
  id: number;
  name: string;
  description: string | null;
  color: string;
  order: number;
  _count: {
    presentations: number;
    sections: number;
  };
}

interface PresentationType {
  id: number;
  name: string;
  description: string | null;
  defaultDuration: number;
  minDuration: number;
  maxDuration: number;
  allowsQA: boolean;
  qaDuration: number;
  order: number;
  _count: {
    presentations: number;
  };
}

export default function CategoryManagementPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [presentationTypes, setPresentationTypes] = useState<PresentationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');

  // Category form state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  // Presentation type form state
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState<PresentationType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    defaultDuration: 20,
    minDuration: 10,
    maxDuration: 30,
    allowsQA: true,
    qaDuration: 5
  });

  const [submitting, setSubmitting] = useState(false);

  // Color options for categories
  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16',
    '#EC4899', '#6B7280'
  ];

  useEffect(() => {
    fetchData();
  }, [conferenceId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();

      // UPDATED: Use /events/ endpoints
      const [categoriesRes, typesRes] = await Promise.all([
        api.get(`/events/${conferenceId}/categories`),
        api.get(`/events/${conferenceId}/presentation-types`)
      ]);

      setCategories(categoriesRes.data);
      setPresentationTypes(typesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load conference setup data');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleCreateCategory = () => {
    setCategoryForm({ name: '', description: '', color: '#3B82F6' });
    setEditingCategory(null);
    setShowCategoryDialog(true);
  };

  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color
    });
    setEditingCategory(category);
    setShowCategoryDialog(true);
  };

  const handleSubmitCategory = async () => {
    try {
      setSubmitting(true);
      const api = await createAuthenticatedApi();

      if (editingCategory) {
        const response = await api.put(`/categories/${editingCategory.id}`, categoryForm);
        setCategories(categories.map(cat => 
          cat.id === editingCategory.id ? response.data : cat
        ));
        toast.success('Category updated successfully');
      } else {
        // UPDATED: Use /events/ endpoint
        const response = await api.post(`/events/${conferenceId}/categories`, categoryForm);
        setCategories([...categories, response.data]);
        toast.success('Category created successfully');
      }

      setShowCategoryDialog(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const api = await createAuthenticatedApi();
      await api.delete(`/api/categories/${categoryId}`);
      setCategories(categories.filter(cat => cat.id !== categoryId));
      toast.success('Category deleted successfully');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  // Presentation type handlers
  const handleCreateType = () => {
    setTypeForm({
      name: '',
      description: '',
      defaultDuration: 20,
      minDuration: 10,
      maxDuration: 30,
      allowsQA: true,
      qaDuration: 5
    });
    setEditingType(null);
    setShowTypeDialog(true);
  };

  const handleEditType = (type: PresentationType) => {
    setTypeForm({
      name: type.name,
      description: type.description || '',
      defaultDuration: type.defaultDuration,
      minDuration: type.minDuration,
      maxDuration: type.maxDuration,
      allowsQA: type.allowsQA,
      qaDuration: type.qaDuration
    });
    setEditingType(type);
    setShowTypeDialog(true);
  };

  const handleSubmitType = async () => {
    try {
      setSubmitting(true);
      const api = await createAuthenticatedApi();

      if (editingType) {
        // Update existing type
        const response = await api.put(`/api/presentation-types/${editingType.id}`, typeForm);
        setPresentationTypes(presentationTypes.map(type => 
          type.id === editingType.id ? response.data : type
        ));
        toast.success('Presentation type updated successfully');
      } else {
        // Create new type
        const response = await api.post(`/api/conferences/${conferenceId}/presentation-types`, typeForm);
        setPresentationTypes([...presentationTypes, response.data]);
        toast.success('Presentation type created successfully');
      }

      setShowTypeDialog(false);
    } catch (error: any) {
      console.error('Error saving presentation type:', error);
      toast.error(error.response?.data?.message || 'Failed to save presentation type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteType = async (typeId: number) => {
    if (!confirm('Are you sure you want to delete this presentation type?')) return;

    try {
      const api = await createAuthenticatedApi();
      await api.delete(`/api/presentation-types/${typeId}`);
      setPresentationTypes(presentationTypes.filter(type => type.id !== typeId));
      toast.success('Presentation type deleted successfully');
    } catch (error: any) {
      console.error('Error deleting presentation type:', error);
      toast.error(error.response?.data?.message || 'Failed to delete presentation type');
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/organizer/events/${conferenceId}`)}
            className="p-0 hover:bg-transparent"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Conference Setup</h1>
            <p className="text-gray-600 mt-1">Configure categories and presentation types</p>
          </div>
        </div>
        
        <Button
          onClick={() => router.push(`/organizer/events/${conferenceId}/schedule-builder`)}
          className="bg-primary hover:bg-primary-700"
        >
          Continue to Schedule Builder
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="categories" className="flex items-center">
            <FolderIcon className="h-4 w-4 mr-2" />
            Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center">
            <PresentationIcon className="h-4 w-4 mr-2" />
            Presentation Types ({presentationTypes.length})
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Conference Categories</h2>
                <p className="text-gray-600">Organize your conference into logical tracks or themes</p>
              </div>
              <Button onClick={handleCreateCategory}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>

            {categories.length === 0 ? (
              <Card className="p-12 text-center">
                <FolderIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
                <p className="text-gray-600 mb-4">
                  Create categories to organize your presentations into logical groups
                </p>
                <Button onClick={handleCreateCategory}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create First Category
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              disabled={category._count.presentations > 0 || category._count.sections > 0}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {category.description && (
                          <p className="text-gray-600 mb-3 text-sm">{category.description}</p>
                        )}
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {category._count.presentations} presentations
                          </Badge>
                          <Badge variant="outline">
                            {category._count.sections} sessions
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Presentation Types Tab */}
        <TabsContent value="types">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Presentation Types</h2>
                <p className="text-gray-600">Define different types of presentations with duration rules</p>
              </div>
              <Button onClick={handleCreateType}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Presentation Type
              </Button>
            </div>

            {presentationTypes.length === 0 ? (
              <Card className="p-12 text-center">
                <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No presentation types yet</h3>
                <p className="text-gray-600 mb-4">
                  Create presentation types to define duration rules and requirements
                </p>
                <Button onClick={handleCreateType}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create First Type
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {presentationTypes.map((type, index) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{type.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditType(type)}
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteType(type.id)}
                              disabled={type._count.presentations > 0}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {type.description && (
                          <p className="text-gray-600 mb-3 text-sm">{type.description}</p>
                        )}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span>Duration: {type.minDuration}-{type.maxDuration} min (default: {type.defaultDuration})</span>
                          </div>
                          {type.allowsQA && (
                            <div className="flex items-center gap-2 text-sm">
                              <TagIcon className="h-4 w-4 text-gray-400" />
                              <span>Includes {type.qaDuration} min Q&A</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">
                          {type._count.presentations} presentations
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                placeholder="e.g., Architecture"
              />
            </div>
            <div>
              <Label htmlFor="category-description">Description (optional)</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      categoryForm.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCategoryForm({...categoryForm, color})}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitCategory}
              disabled={!categoryForm.name.trim() || submitting}
            >
              {submitting ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Presentation Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Presentation Type' : 'Create Presentation Type'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                value={typeForm.name}
                onChange={(e) => setTypeForm({...typeForm, name: e.target.value})}
                placeholder="e.g., Full Paper"
              />
            </div>
            <div>
              <Label htmlFor="type-description">Description (optional)</Label>
              <Textarea
                id="type-description"
                value={typeForm.description}
                onChange={(e) => setTypeForm({...typeForm, description: e.target.value})}
                placeholder="Brief description of this presentation type"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="min-duration">Min Duration (min)</Label>
                <Input
                  id="min-duration"
                  type="number"
                  value={typeForm.minDuration}
                  onChange={(e) => setTypeForm({...typeForm, minDuration: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="default-duration">Default Duration (min)</Label>
                <Input
                  id="default-duration"
                  type="number"
                  value={typeForm.defaultDuration}
                  onChange={(e) => setTypeForm({...typeForm, defaultDuration: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="max-duration">Max Duration (min)</Label>
                <Input
                  id="max-duration"
                  type="number"
                  value={typeForm.maxDuration}
                  onChange={(e) => setTypeForm({...typeForm, maxDuration: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="allows-qa"
                type="checkbox"
                checked={typeForm.allowsQA}
                onChange={(e) => setTypeForm({...typeForm, allowsQA: e.target.checked})}
              />
              <Label htmlFor="allows-qa">Includes Q&A session</Label>
            </div>
            {typeForm.allowsQA && (
              <div>
                <Label htmlFor="qa-duration">Q&A Duration (min)</Label>
                <Input
                  id="qa-duration"
                  type="number"
                  value={typeForm.qaDuration}
                  onChange={(e) => setTypeForm({...typeForm, qaDuration: Number(e.target.value)})}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitType}
              disabled={!typeForm.name.trim() || submitting}
            >
              {submitting ? 'Saving...' : (editingType ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}