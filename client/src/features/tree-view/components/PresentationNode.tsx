"use client";

import React from "react";
import { TreePresentation } from "../types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Heart, ExternalLink, User } from "lucide-react";

interface PresentationNodeProps {
  presentation: TreePresentation;
  isHighlighted: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite?: (presentationId: number) => void;
  onViewDetails?: (presentationId: number) => void;
}

export function PresentationNode({
  presentation,
  isHighlighted,
  isSelected,
  onSelect,
  onToggleFavorite,
  onViewDetails,
}: PresentationNodeProps) {
  const presenters = presentation.authors.filter(a => a.isPresenter);
  const authorNames = presenters.length > 0 
    ? presenters.map(a => a.authorName).join(", ")
    : presentation.authors.map(a => a.authorName).join(", ");

  return (
    <div
      id={`presentation-${presentation.id}`}
      className={cn(
        "ml-8 py-2 px-3 rounded-md transition-all duration-300 cursor-pointer border-l-2",
        isHighlighted && "bg-yellow-50 border-yellow-400 animate-pulse",
        isSelected && !isHighlighted && "bg-primary/5 border-primary",
        !isHighlighted && !isSelected && "border-transparent hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium leading-snug line-clamp-2">
              {presentation.title}
            </h4>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {onToggleFavorite && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(presentation.id);
                  }}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      presentation.isFavorite 
                        ? "fill-red-500 text-red-500" 
                        : "text-muted-foreground"
                    )}
                  />
                </Button>
              )}
              
              {onViewDetails && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(presentation.id);
                  }}
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
          
          {authorNames && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate">{authorNames}</span>
            </div>
          )}
          
          {presentation.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {presentation.keywords.slice(0, 4).map((keyword, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="text-xs px-1.5 py-0"
                >
                  {keyword}
                </Badge>
              ))}
              {presentation.keywords.length > 4 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  +{presentation.keywords.length - 4}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PresentationNode;
