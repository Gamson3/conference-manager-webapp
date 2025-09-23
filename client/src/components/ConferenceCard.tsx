"use client";

import Link from 'next/link';
import Image from 'next/image';
// import { useRouter } from 'next/navigation'; // CHANGED: remove
import { format } from 'date-fns';
import { MapPin, Calendar, Users, Share2, ExternalLink } from 'lucide-react';
import { ConferenceSummary } from '@/types/conference';
// import { useAuth } from '@/app/(auth)/authContext'; // CHANGED: remove
// import { api } from '@/state/api'; // CHANGED: remove
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ConferenceCardProps {
  conference: ConferenceSummary;
  showActions?: boolean;
  isFavorite?: boolean; // CHANGED: deprecated, no longer used
  className?: string;
  variant?: 'default' | 'compact' | 'detailed' | 'list';
  onEdit?: (conference: ConferenceSummary) => void;
  onDelete?: (conference: ConferenceSummary) => void;
}

const ConferenceCard = ({ 
  conference, 
  showActions = false,
  className = "",
  variant = 'default',
  onEdit,
  onDelete
}: ConferenceCardProps) => {
  // const router = useRouter(); // CHANGED: remove
  // const { user, isAuthenticated } = useAuth(); // CHANGED: remove
  
  // CHANGED: remove isFavorite derived from userInteractions
  // const isFavorite = conference.userInteractions?.isFavorited || false;

  // CHANGED: remove toggle favorite mutation

  // Format date range for display
  const formatDateRange = () => {
    if (!conference.startDate || !conference.endDate) return 'Date TBD';
    const start = new Date(conference.startDate);
    const end = new Date(conference.endDate);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    if (start.toDateString() === end.toDateString()) return start.toLocaleDateString('en-US', options);
    return `${start.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit' })} - ${end.toLocaleDateString('en-US', options)}`;
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
      navigator.clipboard.writeText(`${window.location.origin}/attendee/conferences/${conference.id}`);
      toast.success('Link copied to clipboard');
    }
  };

  const getImageHeight = () => {
    switch (variant) {
      case 'compact': return 'h-24';
      case 'detailed': return 'h-48';
      default: return 'h-36';
    }
  };

  const organizerName = conference.createdBy?.name || '';
  const organizerInitials = organizerName
    ? organizerName.split(' ').slice(0,2).map((s: any[]) => s[0]).join('').toUpperCase()
    : 'CO';

  const baseClasses = `bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden group ${className}`;

  // LIST VARIANT (text-first, no banner background)
  if (variant === 'list') {
    return (
      <div className={`bg-white rounded border border-gray-200 shadow transition-shadow overflow-hidden ${className}`}>
        {/* Top row: left (date/title/location), right (organizer logo placeholder) */}
        <div className="flex items-start gap-4 p-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center text-sm text-foreground mb-1">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDateRange()}
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              <Link href={`/attendee/conferences/${conference.id}`} className="hover:underline">
                {conference.name}
              </Link>
            </h3>
            {conference.location && (
              <div className="flex items-center text-sm text-gray-700">
                <MapPin className="h-4 w-4 mr-1" />
                {conference.location}
              </div>
            )}
          </div>

          {/* Organizer logo/placeholder (always visible) */}
          <div className="shrink-0">
            <div className="w-14 h-14 rounded bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
              {organizerInitials}
            </div>
          </div>
        </div>

        {/* Description */}
        {conference.description && (
          <div className="px-4 pb-2 mb-2">
            <p className="text-base text-gray-700 line-clamp-2">
              {conference.description}
            </p>
          </div>
        )}

        {/* Categories */}
        {conference.categories && conference.categories.length > 0 && (
          <div className="px-4 py-0.5 pb-2 flex flex-wrap gap-1">
            {conference.categories.slice(0, 4).map((category) => (
              <span
                key={category.id}
                className="px-2 py-1 bg-gray-100 text-muted-foreground text-xs rounded"
                style={{
                  backgroundColor: category.color ? `${category.color}20` : "#f3f4f6",
                  color: category.color || "#374151",
                }}
              >
                {category.name}
              </span>
            ))}
            {conference.categories.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-muted-foreground text-xs rounded-full">
                +{conference.categories.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer: Interested (left) and Share (right, always visible) */}
        <div className="px-4 py-5 flex items-center justify-between">
          <Link
            href={`/attendee/conferences/${conference.id}`}
            className="inline-flex items-center text-sm text-primary-600 border border-gray-300 shadow rounded px-2 py-1 hover:text-primary-700 font-semibold"
          >
            I’m Interested
          </Link>

          <button
            onClick={(e) => handleShare(e)}
            className="inline-flex items-center text-sm text-gray-700 hover:text-foreground"
            title="Share Conference"
          >
            <Share2 className="h-4 w-4 mr-2" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {/* Image */}
      <div className={`relative ${getImageHeight()} bg-gradient-to-r from-slate-100 to-blue-100`}>
        {conference.bannerImageUrl ? (
          <Image
            src={conference.bannerImageUrl}
            alt={conference.name}
            fill
            className="object-cover"
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <span className="text-primary-700 font-semibold text-lg">
              {conference.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}

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
            <button 
              onClick={handleShare}
              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              title="Share Conference"
            >
              <Share2 className="h-3 w-3 text-muted-foreground" />
            </button>

            {onEdit && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(conference); }}
                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                title="Edit Conference"
              >
                <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {onDelete && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(conference); }}
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

        {/* Status badges */}
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

      {/* Body */}
      <div className="p-3">
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <Calendar className="h-4 w-4 mr-1" />
          {formatDateRange()}
        </div>

        <h3 className={`font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors ${
          variant === 'compact' ? 'text-sm' : 'text-base'
        }`}>
          <Link href={`/attendee/conferences/${conference.id}`} className="hover:underline">
            {conference.name}
          </Link>
        </h3>

        {conference.location && (
          <div className="flex items-center text-sm text-muted-foreground mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            {conference.location}
          </div>
        )}

        {conference.categories && conference.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {conference.categories.slice(0, variant === 'compact' ? 1 : 2).map((category) => (
              <span
                key={category.id}
                className="px-2 py-1 bg-gray-100 text-muted-foreground text-xs rounded-full hover:bg-primary-100 hover:text-primary-600 transition-colors cursor-pointer"
                style={{ backgroundColor: category.color ? `${category.color}20` : undefined, color: category.color || undefined }}
              >
                {category.name}
              </span>
            ))}
            {conference.categories.length > (variant === 'compact' ? 1 : 2) && (
              <span className="px-2 py-1 bg-gray-100 text-muted-foreground text-xs rounded-full">
                +{conference.categories.length - (variant === 'compact' ? 1 : 2)}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <Users className="h-4 w-4 mr-1" />
          <span className="text-sm">
            {conference._count?.attendances || 0} registered
          </span>
        </div>

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