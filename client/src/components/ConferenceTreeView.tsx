import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Coffee, Heart, Clock, Calendar, Tag } from 'lucide-react';
import { ConferenceDetail, TimeSlotWithPresentation } from '@/types/conference';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { api, useTogglePresentationFavoriteMutation } from '@/state/api';
import { useAuth } from '@/app/(auth)/authContext';

interface ConferenceTreeViewProps {
  conference: ConferenceDetail;
}

export default function ConferenceTreeView({ conference }: ConferenceTreeViewProps) {
  const { isAuthenticated } = useAuth();
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [selectedPresentation, setSelectedPresentation] = useState<TimeSlotWithPresentation | null>(null);
  
  // Toggle favorite mutation
  const [toggleFavorite] = useTogglePresentationFavoriteMutation();

  // Handle toggling a day's expanded state
  const toggleDay = (dayId: number) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }));
  };

  // Handle toggling a section's expanded state
  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'h:mm a');
  };

  // Calculate duration between two times
  const getDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    
    return durationMinutes;
  };

  // Format duration for display
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMinutes} min`;
  };

  // Handle favorite toggle for a presentation
  const handleFavoriteToggle = async (presentationId: number, isFavorited: boolean) => {
    if (!isAuthenticated) return;
    
    try {
      await toggleFavorite({
        presentationId,
        isFavorite: !isFavorited
      });
    } catch (error) {
      console.error('Error toggling presentation favorite:', error);
    }
  };

  if (!conference.days || conference.days.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">No schedule information available.</p>
      </div>
    );
  }

  // Check for selected presentation from favorites page
  useEffect(() => {
    const selectedPresentationId = localStorage.getItem('selectedPresentationId');

    if (selectedPresentationId) {
      // Find the presentation in the conference data
      conference.days?.forEach(day => {
        day.sections?.forEach(section => {
          section.timeSlots?.forEach(slot => {
            if (slot.presentation && slot.presentation.id === Number(selectedPresentationId)) {
              // Expand the day and section
              setExpandedDays(prev => ({ ...prev, [day.id]: true }));
              setExpandedSections(prev => ({ ...prev, [section.id]: true }));
              setSelectedPresentation(slot);

              // Scroll to the presentation (with a small delay to ensure DOM is updated)
              setTimeout(() => {
                const element = document.getElementById(`presentation-${selectedPresentationId}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  element.classList.add('bg-yellow-50', 'border-yellow-300');
                  setTimeout(() => {
                    element.classList.remove('bg-yellow-50', 'border-yellow-300');
                  }, 3000);
                }
              }, 100);

              // Clear the selected presentation ID
              localStorage.removeItem('selectedPresentationId');
            }
          });
        });
      });
    }
  }, [conference, setExpandedDays, setExpandedSections]);


  return (
    <div className="space-y-4">
      {/* Days */}
      {conference.days.map(day => (
        <div key={day.id} className="border rounded-md overflow-hidden">
          {/* Day header */}
          <div 
            className="flex items-center justify-between p-4 bg-muted/60 cursor-pointer"
            onClick={() => toggleDay(day.id)}
          >
            <div className="flex items-center">
              {expandedDays[day.id] ? (
                <ChevronDown className="h-5 w-5 mr-2 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 mr-2 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-medium">{day.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(day.date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <Badge variant="outline">
              {day.sections?.length} {day.sections?.length === 1 ? 'section' : 'sections'}
            </Badge>
          </div>
          
          {/* Day content (sections) */}
          {expandedDays[day.id] && (
            <div className="px-4 py-2 space-y-3">
              {day.sections?.length > 0 ? (
                day.sections.map(section => (
                  <Collapsible 
                    key={section.id}
                    open={expandedSections[section.id]}
                    onOpenChange={() => toggleSection(section.id)}
                    className="border rounded-md overflow-hidden"
                  >
                    {/* Section header */}
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center">
                        {expandedSections[section.id] ? (
                          <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
                        )}
                        <div>
                          <h4 className="font-medium text-sm">{section.name}</h4>
                          {section.startTime && section.endTime && (
                            <p className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(section.startTime)} - {formatTime(section.endTime)}
                              {section.room && ` • Room: ${section.room}`}
                            </p>
                          )}
                        </div>
                      </div>
                      {section.category && (
                        <Badge 
                          variant="secondary" 
                          style={{ backgroundColor: section.category.color || undefined }}
                          className="text-xs"
                        >
                          {section.category.name}
                        </Badge>
                      )}
                    </CollapsibleTrigger>
                    
                    {/* Section content (presentations/slots) */}
                    <CollapsibleContent>
                      <div className="p-3 pt-0 space-y-3">
                        {section.timeSlots?.length > 0 ? (
                          section.timeSlots.map(slot => (
                            <div 
                              key={slot.id}
                              id={`presentation-${slot.presentation?.id}`}
                              className={`p-3 rounded-md transition-all duration-300 ${
                                slot.slotType === 'BREAK' 
                                  ? 'bg-muted/40 border border-dashed' 
                                  : 'bg-card hover:bg-muted/30 border cursor-pointer transition-colors'
                              }`}
                              onClick={() => {
                                if (slot.presentation) {
                                  setSelectedPresentation(slot);
                                }
                              }}
                            >
                              {/* Time slot header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                  <span className="mx-1">•</span>
                                  {formatDuration(getDuration(slot.startTime, slot.endTime))}
                                </div>
                                {slot.slotType === 'BREAK' && slot.breakType && (
                                  <Badge variant="outline" className="text-xs">
                                    <Coffee className="h-3 w-3 mr-1" />
                                    {slot.breakType.replace('_', ' ')}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Presentation or break content */}
                              {slot.presentation ? (
                                <div>
                                  <h5 className="font-medium">{slot.presentation.title}</h5>
                                  {slot.presentation.authors?.length > 0 && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {slot.presentation.authors
                                        .filter(a => a.isPresenter)
                                        .map(a => a.authorName)
                                        .join(', ')}
                                    </p>
                                  )}
                                  {slot.presentation.category && (
                                    <Badge 
                                      variant="secondary" 
                                      className="mt-2 text-xs"
                                      style={{ backgroundColor: slot.presentation.category.color || undefined }}
                                    >
                                      {slot.presentation.category.name}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <h5 className="font-medium">{slot.title || 'Break'}</h5>
                                  {slot.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {slot.description}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No scheduled presentations in this section.
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sections scheduled for this day.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      
      {/* Presentation detail dialog */}
      {selectedPresentation && selectedPresentation.presentation && (
        <Dialog open={!!selectedPresentation} onOpenChange={() => setSelectedPresentation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedPresentation.presentation.title}</DialogTitle>
              <DialogDescription className="flex items-center text-sm">
                <Clock className="h-3.5 w-3.5 mr-1" />
                {formatTime(selectedPresentation.startTime)} - {formatTime(selectedPresentation.endTime)}
                <span className="mx-1">•</span>
                {formatDuration(getDuration(selectedPresentation.startTime, selectedPresentation.endTime))}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Presenters */}
              <div>
                <h4 className="text-sm font-medium mb-1 text-muted-foreground">Presented by</h4>
                <div className="space-y-2">
                  {selectedPresentation.presentation.authors?.filter(a => a.isPresenter).map(presenter => (
                    <div key={presenter.id} className="flex items-start">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 mr-3">
                        {presenter.authorName.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{presenter.authorName}</p>
                        {presenter.affiliation && (
                          <p className="text-sm text-muted-foreground">
                            {presenter.affiliation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Abstract */}
              {selectedPresentation.presentation.abstract && (
                <div>
                  <h4 className="text-sm font-medium mb-1 text-muted-foreground">Abstract</h4>
                  <p className="text-sm whitespace-pre-line">
                    {selectedPresentation.presentation.abstract}
                  </p>
                </div>
              )}
              
              {/* Categories and tags */}
              <div className="flex flex-wrap gap-3">
                {selectedPresentation.presentation.category && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-muted-foreground">Category</h4>
                    <Badge 
                      variant="secondary" 
                      style={{ backgroundColor: selectedPresentation.presentation.category.color || undefined }}
                    >
                      {selectedPresentation.presentation.category.name}
                    </Badge>
                  </div>
                )}
                
                {selectedPresentation.presentation.presentationType && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-muted-foreground">Type</h4>
                    <Badge variant="outline">
                      {selectedPresentation.presentation.presentationType.name}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Favorite button */}
              {isAuthenticated && (
                <div className="pt-2 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavoriteToggle(
                        selectedPresentation.presentation!.id, 
                        !!selectedPresentation.presentation!.userInteractions?.isFavorited
                      );
                    }}
                    className={selectedPresentation.presentation.userInteractions?.isFavorited 
                      ? 'text-rose-500 border-rose-200' 
                      : ''}
                  >
                    <Heart 
                      className={`h-4 w-4 mr-2 ${
                        selectedPresentation.presentation.userInteractions?.isFavorited 
                          ? 'fill-rose-500' 
                          : ''
                      }`} 
                    />
                    {selectedPresentation.presentation.userInteractions?.isFavorited 
                      ? 'Remove from Favorites' 
                      : 'Add to Favorites'
                    }
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}