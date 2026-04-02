import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEventImage } from "@/lib/eventImages";

interface RecentEvent {
  id: string;
  slug: string;
  title: string;
  image_url: string;
  start_at: string;
  location: string;
  type: string;
  viewedAt: number;
}

export default function RecentlyViewedEvents() {
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);

  useEffect(() => {
    loadRecentEvents();
  }, []);

  const loadRecentEvents = async () => {
    try {
      const stored = localStorage.getItem("recentlyViewedEvents");
      if (stored) {
        const events: RecentEvent[] = JSON.parse(stored);

        // Filter out events that no longer exist in DB
        const ids = events.map((e) => e.id);
        const { data: existingEvents, error } = await supabase
          .from("events")
          .select("id")
          .in("id", ids);

        if (error) throw error;

        const existingIds = new Set(existingEvents?.map((e) => e.id));
        const filtered = events.filter((e) => existingIds.has(e.id));

        // Update localStorage if some were removed
        if (filtered.length !== events.length) {
          localStorage.setItem(
            "recentlyViewedEvents",
            JSON.stringify(filtered),
          );
        }

        setRecentEvents(filtered.slice(0, 5));
      }
    } catch (err) {
      console.error("Error loading recent events:", err);
    }
  };

  if (recentEvents.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Recently Viewed</h3>
        </div>

        <div className="space-y-3">
          {recentEvents.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.slug}`}
              className="flex gap-3 p-2 rounded-lg hover:bg-accent/10 transition"
            >
              <img
                src={getEventImage(event.image_url) || event.image_url}
                alt={event.title}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm line-clamp-1">
                  {event.title}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(event.start_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
