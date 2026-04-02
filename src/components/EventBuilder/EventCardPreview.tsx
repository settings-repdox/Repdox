import React from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';import { formatDate } from "@/lib/timeUtils";import { getEventImage } from '@/lib/eventImages';

interface EventCardPreviewProps {
  title?: string;
  description?: string;
  date?: string;
  location?: string;
  cover?: string;
  tags?: string[];
  type?: string;
  format?: string | string[];
}

export default function EventCardPreview({ 
  title, 
  description, 
  date, 
  location, 
  cover, 
  tags = [],
  type,
  format
}: EventCardPreviewProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden bg-muted">
        {cover ? (
          <img 
            src={/^blob:|https?:\/\//i.test(cover) ? cover : getEventImage(cover)} 
            alt={title || 'Event cover'} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Calendar className="w-12 h-12 opacity-20" />
          </div>
        )}
        
        {/* Type Badge */}
        {type && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {Array.isArray(type) ? (
              type.map((t) => (
                <Badge key={t} className="bg-purple-600 hover:bg-purple-700 text-white border-0 text-[10px] px-2 py-0.5">
                  {t}
                </Badge>
              ))
            ) : (
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-0">
                {type}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Title */}
        <h3 className="text-xl font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title || 'Untitled Event'}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {description || 'No description yet — add details to make your event stand out.'}
        </p>

        {/* Meta Info */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {date ? (
                <span>{formatDate(date)}</span>
              ) : ( 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              }) : 'Date not set'}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="truncate">{location || 'Location not set'}</span>
              {format && (
                <span className="text-[10px] text-purple-500 font-medium">
                  {Array.isArray(format) ? format.join(", ") : String(format)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {tags.slice(0, 3).map((tag, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="text-xs px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
