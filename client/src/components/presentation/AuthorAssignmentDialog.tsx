"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, X, User } from 'lucide-react';
import { createAuthenticatedApi } from '@/lib/utils';
import { toast } from 'sonner';

interface Author {
  id?: number;
  name: string;
  email: string;
  affiliation?: string;
  isPresenter: boolean;
  isInternal: boolean;
}

interface InternalUser {
  id: number;
  name: string;
  email: string;
  organization?: string;
}

interface AuthorAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  presentationId: number;
  existingAuthors: Author[];
  onSuccess: () => void;
}

export default function AuthorAssignmentDialog({
  open,
  onClose,
  presentationId,
  existingAuthors,
  onSuccess
}: AuthorAssignmentDialogProps) {
  const [authors, setAuthors] = useState<Author[]>(existingAuthors);
  const [searchTerm, setSearchTerm] = useState('');
  const [internalUsers, setInternalUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false); // Add searching state
  
  // External author form
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalAffiliation, setExternalAffiliation] = useState('');

  // Cache for search results to avoid repeated API calls
  const [searchCache, setSearchCache] = useState<Map<string, InternalUser[]>>(new Map());

  useEffect(() => {
    if (open) {
      setAuthors(existingAuthors);
      // Clear search when dialog opens
      setSearchTerm('');
      setInternalUsers([]);
      setSearchCache(new Map()); // Clear cache when dialog opens
    }
  }, [open, existingAuthors]);

  // Memoized search function to prevent unnecessary re-creation
  const searchInternalUsers = useCallback(async (searchValue: string) => {
    // If no search term, clear results
    if (!searchValue || searchValue.trim().length === 0) {
      setInternalUsers([]);
      setSearching(false);
      return;
    }

    // Only search if search term has at least 3 characters
    if (searchValue.trim().length < 3) {
      setInternalUsers([]);
      return;
    }

    const trimmedSearch = searchValue.trim().toLowerCase();
    
    // Check cache first
    if (searchCache.has(trimmedSearch)) {
      setInternalUsers(searchCache.get(trimmedSearch)!);
      return;
    }
    
    try {
      setSearching(true);
      console.log('API call for:', trimmedSearch); // This should happen less frequently now
      const api = await createAuthenticatedApi();
      const response = await api.get('/users/search', {
        params: { q: trimmedSearch }
      });
      
      const results = response.data;
      
      // Cache the results
      setSearchCache(prev => new Map(prev).set(trimmedSearch, results));
      setInternalUsers(results);
    } catch (error) {
      console.error('Error searching users:', error);
      setInternalUsers([]);
    } finally {
      setSearching(false);
    }
  }, [searchCache]);

  // Improved debounced search with longer delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchInternalUsers(searchTerm);
    }, 600); // Increased from 300ms to 600ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchInternalUsers]);

  // Memoized functions to prevent unnecessary re-renders
  const addInternalAuthor = useCallback((user: InternalUser) => {
    const alreadyAdded = authors.some(a => a.email === user.email);
    if (alreadyAdded) {
      toast.error('Author already added');
      return;
    }

    setAuthors(prev => [...prev, {
      id: user.id,
      name: user.name,
      email: user.email,
      affiliation: user.organization,
      isPresenter: false,
      isInternal: true
    }]);

    // Clear search after adding
    setSearchTerm('');
    setInternalUsers([]);
  }, [authors]);

  const addExternalAuthor = useCallback(() => {
    if (!externalName || !externalEmail) {
      toast.error('Name and email are required');
      return;
    }

    const alreadyAdded = authors.some(a => a.email === externalEmail);
    if (alreadyAdded) {
      toast.error('Author already added');
      return;
    }

    setAuthors(prev => [...prev, {
      name: externalName,
      email: externalEmail,
      affiliation: externalAffiliation,
      isPresenter: false,
      isInternal: false
    }]);

    // Reset form
    setExternalName('');
    setExternalEmail('');
    setExternalAffiliation('');
  }, [externalName, externalEmail, externalAffiliation, authors]);

  const removeAuthor = useCallback((email: string) => {
    setAuthors(prev => prev.filter(a => a.email !== email));
  }, []);

  const togglePresenter = useCallback((email: string) => {
    setAuthors(prev => prev.map(a => 
      a.email === email ? { ...a, isPresenter: !a.isPresenter } : a
    ));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      const api = await createAuthenticatedApi();
      
      const authorsData = authors.map((author, index) => ({
        authorName: author.name,
        authorEmail: author.email,
        affiliation: author.affiliation || '',
        isPresenter: author.isPresenter,
        isExternal: !author.isInternal,
        internalUserId: author.isInternal ? author.id : null,
        order: index + 1
      }));

      console.log('Saving authors for presentation:', presentationId); // Debug log
      console.log('Authors data being sent:', authorsData); // Debug log
      
      const response = await api.post(`/api/presentations/${presentationId}/authors`, {
        authors: authorsData
      });

      console.log('Save response:', response.data); // Debug log

      toast.success('Authors updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating authors:', error);
      console.error('Error response:', error.response?.data); // Better error logging
      toast.error(error.response?.data?.message || 'Failed to update authors');
    } finally {
      setLoading(false);
    }
  }, [authors, presentationId, onSuccess, onClose]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setInternalUsers([]);
  }, []);

  // Memoize search results display to prevent unnecessary re-renders
  const searchResultsDisplay = useMemo(() => {
    if (searching) {
      return (
        <div className="text-center py-4 text-gray-500">
          Searching...
        </div>
      );
    }
    
    if (!searching && searchTerm && searchTerm.length >= 2 && internalUsers.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <User className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p>No users found matching "{searchTerm}"</p>
          <p className="text-xs">Try a different search term</p>
        </div>
      );
    }

    if (!searching && searchTerm && searchTerm.length < 2) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Search className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p>Type at least 2 characters to search</p>
        </div>
      );
    }

    if (!searching && !searchTerm) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Search className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p>Start typing to search for users</p>
        </div>
      );
    }

    if (!searching && internalUsers.length > 0) {
      return (
        <div className="space-y-2">
          {internalUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <User className="h-8 w-8 text-gray-400" />
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                  {user.organization && (
                    <div className="text-sm text-gray-500">{user.organization}</div>
                  )}
                  {user.role && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {user.role}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addInternalAuthor(user)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          ))}
        </div>
      );
    }

    return null;
  }, [searching, searchTerm, internalUsers, addInternalAuthor]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white min-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Authors to Presentation</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Authors */}
          <div>
            <h3 className="font-semibold mb-3">Current Authors ({authors.length})</h3>
            {authors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No authors assigned yet. Add authors using the tabs below.
              </div>
            ) : (
              <div className="space-y-2">
                {authors.map((author, index) => (
                  <div key={author.email} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{author.name}</div>
                        <div className="text-sm text-gray-600">{author.email}</div>
                        {author.affiliation && (
                          <div className="text-sm text-gray-500">{author.affiliation}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={author.isInternal ? 'default' : 'outline'}>
                          {author.isInternal ? 'Internal' : 'External'}
                        </Badge>
                        {author.isPresenter && (
                          <Badge variant="secondary">Presenter</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePresenter(author.email)}
                      >
                        {author.isPresenter ? 'Remove Presenter' : 'Make Presenter'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAuthor(author.email)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Authors */}
          <Tabs defaultValue="internal">
            <TabsList className="mb-4">
              <TabsTrigger value="internal" className="mr-2">Add Internal User</TabsTrigger>
              <TabsTrigger value="external">Add External Author</TabsTrigger>
            </TabsList>

            <TabsContent value="internal" className="space-y-4">
              <div>
                <Label htmlFor="search">Search Internal Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name or email (min 3 characters)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Search instructions */}
                <p className="text-sm text-gray-500 mt-1">
                  Only attendees and organizers will be shown in search results.
                </p>
              </div>

              {/* Search Results */}
              <div className="max-h-64 overflow-y-auto">
                {searchResultsDisplay}
              </div>
            </TabsContent>

            <TabsContent value="external" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="externalName">Name *</Label>
                  <Input
                    id="externalName"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="externalEmail">Email *</Label>
                  <Input
                    id="externalEmail"
                    type="email"
                    value={externalEmail}
                    onChange={(e) => setExternalEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="externalAffiliation">Affiliation</Label>
                <Input
                  id="externalAffiliation"
                  value={externalAffiliation}
                  onChange={(e) => setExternalAffiliation(e.target.value)}
                />
              </div>
              <Button onClick={addExternalAuthor}>
                <Plus className="h-4 w-4" />
                Add External Author
              </Button>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Authors'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}