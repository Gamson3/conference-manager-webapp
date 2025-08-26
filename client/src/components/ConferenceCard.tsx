"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { MapPin, Calendar, Users, Heart, Share2, ExternalLink } from 'lucide-react';
import { ConferenceSummary } from '@/types/conference';
import { useAuth } from '@/app/(auth)/authContext';
import { api } from '@/state/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ConferenceCardProps {
  conference: ConferenceSummary;
  showActions?: boolean;
  isFavorite?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  onEdit?: (conference: ConferenceSummary) => void;
  onDelete?: (conference: ConferenceSummary) => void;
}

const ConferenceCard = ({ 
  conference, 
  showActions = false,
  isFavorite: initialFavorite = false,
  className = "",
  variant = 'default',
  onEdit,
  onDelete
}: ConferenceCardProps) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  
  const [toggleFavorite] = api.useToggleConferenceFavoriteMutation();
  const [registerForConference] = api.useRegisterForConferenceMutation();

  // Format date range for display
  const formatDateRange = () => {
    if (!conference.startDate || !conference.endDate) return 'Date TBD';
    
    const start = new Date(conference.startDate);
    const end = new Date(conference.endDate);
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    };
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', options);
    }
    
    return `${start.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit' })} - ${end.toLocaleDateString('en-US', options)}`;
  };

  // Handle favorite button click
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      router.push(`/signin?redirect=/attendee/discover`);
      return;
    }
    
    try {
      await toggleFavorite({
        conferenceId: conference.id,
        isFavorite: !isFavorite
      }).unwrap();
      
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  // Handle share functionality
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: conference.name,
          text: conference.description || `${conference.name} conference`,
          url: `/attendee/conferences/${conference.id}`
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/attendee/conferences/${conference.id}`);
      toast.success('Link copied to clipboard');
    }
  };

  // Get image height based on variant
  const getImageHeight = () => {
    switch (variant) {
      case 'compact': return 'h-24';
      case 'detailed': return 'h-48';
      default: return 'h-36';
    }
  };

  const baseClasses = `bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden group ${className}`;

  return (
    <div className={baseClasses}>
      {/* Conference Image */}
      <div className={`relative ${getImageHeight()} bg-gradient-to-r from-slate-100 to-blue-100`}>
        {conference.bannerImageUrl ? (
          <Image
            src={conference.bannerImageUrl}
            alt={conference.name}
            fill
            className="object-cover"
            onError={(e) => {
              // Fallback to gradient background if image fails
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <span className="text-primary-700 font-semibold text-lg">
              {conference.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Conference organizer logo/initial - if we add this field later */}
        {conference.createdBy && (
          <div className="absolute top-2 right-2 w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
            <div className="w-6 h-6 bg-primary-600 rounded text-white text-xs flex items-center justify-center font-semibold">
              {conference.createdBy.name?.substring(0, 2).toUpperCase() || 'CO'}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="absolute top-2 left-2 flex gap-1">
            {/* Share Button */}
            <button 
              onClick={handleShare}
              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              title="Share Conference"
            >
              <Share2 className="h-3 w-3 text-gray-600" />
            </button>
            
            {/* Favorite Button */}
            <button 
              onClick={handleFavoriteClick}
              className={`w-7 h-7 ${isFavorite ? 'bg-rose-100/90' : 'bg-white/90'} rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:${isFavorite ? 'bg-rose-200' : 'bg-white'}`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-3 w-3 ${isFavorite ? 'text-rose-500 fill-rose-500' : 'text-gray-600'}`} />
            </button>
            
            {/* Edit Button (for organizer dashboard) */}
            {onEdit && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(conference);
                }}
                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                title="Edit Conference"
              >
                <svg className="h-3 w-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Delete Button (for organizer dashboard) */}
            {onDelete && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(conference);
                }}
                className="w-7 h-7 bg-red-100/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                title="Delete Conference"
              >
                <svg className="h-3 w-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {conference.status !== 'published' && (
            <Badge variant="outline" className="bg-gray-500/80 text-white border-0">
              {conference.status === 'draft' ? 'Draft' : conference.status}
            </Badge>
          )}
          {variant === 'detailed' && conference._count?.presentations > 0 && (
            <Badge variant="outline" className="bg-blue-500/80 text-white border-0">
              {conference._count.presentations} {conference._count.presentations === 1 ? 'Presentation' : 'Presentations'}
            </Badge>
          )}
        </div>
      </div>

      {/* Conference Details */}
      <div className="p-3">
        {/* Date */}
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <Calendar className="h-4 w-4 mr-1" />
          {formatDateRange()}
        </div>

        {/* Title */}
        <h3 className={`font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors ${
          variant === 'compact' ? 'text-sm' : 'text-base'
        }`}>
          <Link href={`/attendee/conferences/${conference.id}`} className="hover:underline">
            {conference.name}
          </Link>
        </h3>

        {/* Location */}
        {conference.location && (
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            {conference.location}
          </div>
        )}

        {/* Categories */}
        {conference.categories && conference.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {conference.categories.slice(0, variant === 'compact' ? 1 : 2).map((category) => (
              <span
                key={category.id}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer"
                style={{ backgroundColor: category.color ? `${category.color}20` : undefined, 
                         color: category.color || undefined }}
              >
                {category.name}
              </span>
            ))}
            {conference.categories.length > (variant === 'compact' ? 1 : 2) && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{conference.categories.length - (variant === 'compact' ? 1 : 2)}
              </span>
            )}
          </div>
        )}

        {/* Description (only for detailed variant) */}
        {variant === 'detailed' && conference.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {conference.description}
          </p>
        )}

        {/* Attendee Count */}
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <Users className="h-4 w-4 mr-1" />
          <span className="text-sm">
            {conference._count?.attendances || 0} registered
          </span>
        </div>

        {/* View Conference Link */}
        <div className="pt-3 border-t border-gray-100">
          <Link
            href={`/attendee/conferences/${conference.id}`}
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium"
          >
            View Details <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConferenceCard;