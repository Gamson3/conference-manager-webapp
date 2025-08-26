"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Conference {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

interface PresentationType {
  id: number;
  name: string;
  defaultDuration: number;
}

interface Category {
  id: number;
  name: string;
}

export default function SubmitPresentationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [presentationTypes, setPresentationTypes] = useState<PresentationType[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    conferenceId: '',
    categoryId: '',
    presentationTypeId: '',
    keywords: '',
    requestedDuration: 0,
    authors: [{ name: '', email: '', affiliation: '', isPresenter: true }]
  });
  
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const session = await fetchAuthSession();
        if (!session.tokens?.idToken) {
          throw new Error('Not authenticated');
        }
        
        const api = axios.create({
          baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002',
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`
          }
        });
        
        // Fetch conferences accepting submissions
        const { data } = await api.get('/api/conferences?status=call_for_papers');
        setConferences(data);
        
        if (data.length > 0) {
          // Set default conference
          setFormData(prev => ({ ...prev, conferenceId: data[0].id.toString() }));
          
          // Fetch categories for this conference
          const catResponse = await api.get(`/api/conferences/${data[0].id}/categories`);
          setCategories(catResponse.data);
          
          // Fetch presentation types
          const typesResponse = await api.get(`/api/conferences/${data[0].id}/presentation-types`);
          setPresentationTypes(typesResponse.data);
          
          if (typesResponse.data.length > 0) {
            setFormData(prev => ({
              ...prev,
              presentationTypeId: typesResponse.data[0].id.toString(),
              requestedDuration: typesResponse.data[0].defaultDuration
            }));
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load conferences');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleConferenceChange = async (conferenceId: string) => {
    try {
      setFormData(prev => ({ ...prev, conferenceId }));
      
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Not authenticated');
      }
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002',
        headers: {
          Authorization: `Bearer ${session.tokens.idToken.toString()}`
        }
      });
      
      // Get categories for this conference
      const catResponse = await api.get(`/api/conferences/${conferenceId}/categories`);
      setCategories(catResponse.data);
      
      // Get presentation types
      const typesResponse = await api.get(`/api/conferences/${conferenceId}/presentation-types`);
      setPresentationTypes(typesResponse.data);
      
      // Reset category and presentation type
      setFormData(prev => ({
        ...prev,
        categoryId: '',
        presentationTypeId: '',
        requestedDuration: 0
      }));
    } catch (error) {
      console.error('Error fetching conference data:', error);
      toast.error('Failed to load conference details');
    }
  };
  
  const handlePresentationTypeChange = (typeId: string) => {
    const selectedType = presentationTypes.find(t => t.id.toString() === typeId);
    if (selectedType) {
      setFormData(prev => ({
        ...prev,
        presentationTypeId: typeId,
        requestedDuration: selectedType.defaultDuration
      }));
    }
  };
  
  const handleAuthorChange = (index: number, field: string, value: string | boolean) => {
    const newAuthors = [...formData.authors];
    newAuthors[index] = { ...newAuthors[index], [field]: value };
    setFormData(prev => ({ ...prev, authors: newAuthors }));
  };
  
  const addAuthor = () => {
    setFormData(prev => ({
      ...prev,
      authors: [...prev.authors, { name: '', email: '', affiliation: '', isPresenter: false }]
    }));
  };
  
  const removeAuthor = (index: number) => {
    if (formData.authors.length <= 1) return;
    const newAuthors = formData.authors.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, authors: newAuthors }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    if (!formData.conferenceId) {
      toast.error('Please select a conference');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare submission data
      const keywords = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);
      
      const submissionData = {
        ...formData,
        keywords,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        presentationTypeId: formData.presentationTypeId ? parseInt(formData.presentationTypeId) : null
      };
      
      // Get auth token
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        throw new Error('Not authenticated');
      }
      
      // Submit presentation
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002',
        headers: {
          Authorization: `Bearer ${session.tokens.idToken.toString()}`
        }
      });
      
      await api.post(`/api/conferences/${formData.conferenceId}/submit`, submissionData);
      
      toast.success('Presentation submitted successfully!');
      router.push('/presenter/submissions');
    } catch (error: any) {
      console.error('Error submitting presentation:', error);
      toast.error(error.response?.data?.message || 'Failed to submit presentation');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Submit Presentation</h1>
        <Card>
          <CardContent className="p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading submission form...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (conferences.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Submit Presentation</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No Open Calls for Papers</h2>
            <p className="text-muted-foreground mb-6">
              There are currently no conferences accepting submissions.
            </p>
            <Button onClick={() => router.push('/attendee/discover')}>
              Browse Conferences
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Submit Presentation</h1>
      
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Presentation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="conferenceId">Conference</Label>
              <Select 
                value={formData.conferenceId}
                onValueChange={handleConferenceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a conference" />
                </SelectTrigger>
                <SelectContent>
                  {conferences.map(conf => (
                    <SelectItem key={conf.id} value={conf.id.toString()}>
                      {conf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter presentation title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="abstract">Abstract</Label>
              <Textarea
                id="abstract"
                name="abstract"
                value={formData.abstract}
                onChange={handleChange}
                placeholder="Enter abstract (summary of your presentation)"
                rows={5}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select 
                  value={formData.categoryId}
                  onValueChange={val => setFormData(prev => ({ ...prev, categoryId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="presentationTypeId">Presentation Type</Label>
                <Select
                  value={formData.presentationTypeId}
                  onValueChange={handlePresentationTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select presentation type" />
                  </SelectTrigger>
                  <SelectContent>
                    {presentationTypes.map(type => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name} ({type.defaultDuration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma separated)</Label>
              <Input
                id="keywords"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                placeholder="e.g. technology, innovation, research"
              />
              <p className="text-xs text-muted-foreground">Add 3-5 keywords that describe your presentation</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authors</CardTitle>
            <CardDescription>Add all authors of this presentation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.authors.map((author, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Author {index + 1}</h3>
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAuthor(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={author.name}
                      onChange={(e) => handleAuthorChange(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={author.email}
                      onChange={(e) => handleAuthorChange(index, 'email', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Affiliation</Label>
                  <Input
                    value={author.affiliation}
                    onChange={(e) => handleAuthorChange(index, 'affiliation', e.target.value)}
                    placeholder="University or Organization"
                  />
                </div>
              </div>
            ))}
            
            <Button type="button" variant="outline" onClick={addAuthor}>
              Add Another Author
            </Button>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Presentation'}
          </Button>
        </div>
      </form>
    </div>
  );
}