import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { Link } from "react-router-dom";
import { getEventImage, getEventImageUrl } from "@/lib/eventImages";
import { formatDate, formatDateWithOptions } from "@/lib/timeUtils";
import { useEffect, useState } from "react";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    type: string | string[];
    start_at: string;
    end_at: string;
    location: string | null;
    format: string | string[];
    short_blurb: string | null;
    image_url: string | null;
    tags: string[] | null;
  };
  compact?: boolean;
}

export default function EventCard({ event, compact = false }: EventCardProps) {
  const countdown = useCountdown(event.start_at);
  const isEnded = new Date() > new Date(event.end_at);
  const [imgSrc, setImgSrc] = useState<string | undefined>(
    () => getEventImage(event.image_url) || event.image_url || undefined,
  );

  useEffect(() => {
    let mounted = true;
    async function resolve() {
      if (!event.image_url) return;
      if (/^https?:\/\//i.test(event.image_url)) return; // already absolute

      // Check for known local assets
      const isKnownAsset =
        event.image_url.includes("event-hackathon") ||
        event.image_url.includes("event-mun") ||
        event.image_url.includes("event-workshop") ||
        event.image_url.includes("event-gaming");

      if (isKnownAsset) return;

      try {
        const url = await getEventImageUrl(event.image_url);
        if (mounted && url) setImgSrc(url);
      } catch (e) {
        console.error("Failed to resolve event image url", e);
      }
    }
    resolve();
    return () => {
      mounted = false;
    };
  }, [event.image_url]);

  if (compact) {
    return (
      <div className="flex-shrink-0 w-[85vw] sm:w-[350px] md:w-[380px] snap-center">
        <Card className="h-full border-border bg-card hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover-lift">
          <div className="relative h-48 overflow-hidden rounded-t-lg">
            <img
              src={imgSrc}
              alt={event.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            {isEnded && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                <span className="text-foreground border-2 border-foreground/40 bg-background/80 font-semibold tracking-widest text-sm uppercase px-3 py-1.5 rounded-lg select-none">
                  Ended
                </span>
              </div>
            )}
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm border-border"
            >
              {Array.isArray(event.type) ? (
                <div className="flex flex-wrap gap-1">
                  {event.type.map((t) => (
                    <Badge
                      key={t}
                      className="bg-accent/90 hover:bg-accent text-accent-foreground text-[10px] px-2 py-0"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge className="bg-accent/90 hover:bg-accent text-accent-foreground text-[10px] px-2 py-0">
                  {event.type}
                </Badge>
              )}
            </Badge>
          </div>

          <CardHeader className="pb-3">
            <CardTitle className="text-lg line-clamp-1">
              {event.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-xs">
              {event.short_blurb}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(event.start_at)}</span>
            </div>
            {event.location && typeof event.location === 'string' && event.location.trim() && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <Clock className={`h-3 w-3 ${isEnded ? "text-destructive" : "text-accent"}`} />
              <span className={`font-mono ${isEnded ? "text-destructive font-semibold" : "text-accent"}`}>
                {isEnded
                  ? "Ended"
                  : countdown.isExpired
                  ? "Started"
                  : `Starts in ${countdown.compactFormatted}`}
              </span>
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            <Link to={`/events/${event.slug}`} className="w-full">
              <Button variant="default" size="sm" className="w-full">
                Details
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden h-full flex flex-col group border-border hover:border-accent/50 transition-all duration-300 hover-lift">
      <div className="relative h-48 overflow-hidden">
        <img
          src={imgSrc}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {isEnded && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="text-foreground border-2 border-foreground/40 bg-background/80 font-semibold tracking-widest text-xl uppercase px-4 py-2 rounded-lg select-none">
              Ended
            </span>
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border-border"
        >
          {Array.isArray(event.type) ? (
            <div className="flex flex-wrap gap-1">
              {event.type.map((t) => (
                <Badge
                  key={t}
                  className="bg-accent text-accent-foreground border-0 text-[10px] px-2 py-0"
                >
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            event.type
          )}
        </Badge>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
          <div className={`flex items-center gap-2 text-sm font-mono ${isEnded ? "text-destructive" : "text-accent"}`}>
            <Clock className="h-4 w-4" />
            {isEnded
              ? "Event Ended"
              : countdown.isExpired
              ? "Event Started"
              : `Starts in ${countdown.formatted}`}
          </div>
        </div>
      </div>

      <CardHeader>
        <CardTitle className="text-2xl font-display group-hover:text-accent transition-colors">
          {event.title}
        </CardTitle>
        <CardDescription>{event.short_blurb}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDateWithOptions(event.start_at, { weekday: true })}
            </span>
          </div>
          {event.location && typeof event.location === 'string' && event.location.trim() && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}
          <Badge variant="outline" className="text-xs">
            {Array.isArray(event.format)
              ? event.format.join(", ")
              : String(event.format)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {event.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs border-border whitespace-nowrap"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="default" className="flex-1" asChild>
          {/* Ensure there is a leading / before events */}
          <Link to={`/events/${event.slug}`}>Details</Link>
        </Button>
        <Button
          variant="outline"
          className="flex-1 hover:bg-accent/10 hover:border-accent/50"
          disabled={isEnded}
          asChild={!isEnded}
        >
          {isEnded ? (
            <span>Ended</span>
          ) : (
            <Link to={`/events/${event.slug}#register`}>Register</Link>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
