"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface Author {
  authorName: string;
  authorEmail: string;
  affiliation?: string;
  isPresenter?: boolean;
  order: number;
}

interface AuthorManagementProps {
  authors: Author[];
  onChange: (authors: Author[]) => void;
  errors: any;
  requireAffiliation: boolean;
  maxCoAuthors: number;
}

export function AuthorManagement({
  authors,
  onChange,
  errors,
  requireAffiliation,
  maxCoAuthors
}: AuthorManagementProps) {
  const [showErrors, setShowErrors] = useState(false);

  const addAuthor = () => {
    if (authors.length >= maxCoAuthors) {
      return;
    }
    
    const newAuthor: Author = {
      authorName: "",
      authorEmail: "",
      affiliation: "",
      isPresenter: false,
      order: authors.length
    };
    
    onChange([...authors, newAuthor]);
  };

  const removeAuthor = (index: number) => {
    if (authors.length <= 1) {
      return; // Keep at least one author
    }
    
    const newAuthors = authors.filter((_, i) => i !== index);
    // Update order values
    newAuthors.forEach((author, idx) => {
      author.order = idx;
    });
    
    onChange(newAuthors);
  };

  const updateAuthor = (index: number, field: string, value: any) => {
    const newAuthors = [...authors];
    newAuthors[index] = {
      ...newAuthors[index],
      [field]: value
    };
    onChange(newAuthors);
    setShowErrors(true);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(authors);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order values
    items.forEach((author, idx) => {
      author.order = idx;
    });
    
    onChange(items);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Authors</h3>
          <p className="text-sm text-gray-500">
            Add all contributing authors to your submission. Drag to reorder.
          </p>
        </div>
        <Button
          type="button"
          onClick={addAuthor}
          disabled={authors.length >= maxCoAuthors}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Author
        </Button>
      </div>
      
      {errors && showErrors && (
        <div className="text-sm text-red-500 flex items-center gap-2 p-2 bg-red-50 rounded">
          <AlertCircle className="h-4 w-4" />
          <span>Please fix errors with author information</span>
        </div>
      )}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="authors">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {authors.map((author, index) => (
                <Draggable key={index} draggableId={`author-${index}`} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="relative"
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="absolute top-0 left-0 w-full h-6 bg-gray-100 rounded-t-lg cursor-move"
                      />
                      <CardHeader className="pt-8 pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">
                            Author {index + 1}
                            {author.isPresenter && (
                              <Badge className="ml-2 bg-primary">Presenter</Badge>
                            )}
                          </CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAuthor(index)}
                            disabled={authors.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`author-name-${index}`}>Name*</Label>
                            <Input
                              id={`author-name-${index}`}
                              value={author.authorName}
                              onChange={(e) => updateAuthor(index, "authorName", e.target.value)}
                              placeholder="Full Name"
                            />
                            {errors?.[index]?.authorName && (
                              <p className="text-xs text-red-500">
                                {errors[index].authorName.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`author-email-${index}`}>Email*</Label>
                            <Input
                              id={`author-email-${index}`}
                              value={author.authorEmail}
                              onChange={(e) => updateAuthor(index, "authorEmail", e.target.value)}
                              placeholder="Email Address"
                            />
                            {errors?.[index]?.authorEmail && (
                              <p className="text-xs text-red-500">
                                {errors[index].authorEmail.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`author-affiliation-${index}`}>
                            Affiliation{requireAffiliation && '*'}
                          </Label>
                          <Input
                            id={`author-affiliation-${index}`}
                            value={author.affiliation || ""}
                            onChange={(e) => updateAuthor(index, "affiliation", e.target.value)}
                            placeholder="Organization or Institution"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`author-presenter-${index}`}
                            checked={author.isPresenter}
                            onCheckedChange={(checked) => updateAuthor(index, "isPresenter", checked)}
                          />
                          <Label htmlFor={`author-presenter-${index}`}>
                            This author will present the submission
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {authors.length >= maxCoAuthors && (
        <p className="text-sm text-amber-600">
          Maximum number of co-authors ({maxCoAuthors}) reached.
        </p>
      )}
    </div>
  );
}