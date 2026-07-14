import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Download, Activity, Search } from "lucide-react";
import OrganizerRegistrations from "@/components/OrganizerRegistrations";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ADMIN_EMAILS } from "@/lib/adminService";
import { resolveService } from "@/core/services/di";
import type { IEventService } from "@/domains/events/interfaces/IEventService";

const eventServiceCore = () => resolveService<IEventService>("EventService");

export default function EventRegistrations() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Event slug is required");
      const eventData = await eventServiceCore().getEventBySlug(slug);
      if (!eventData) throw new Error("Event not found");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isOwner = user && eventData.created_by === user.id;
      const isAdmin = user?.email
        ? ADMIN_EMAILS.includes(user.email.toLowerCase())
        : false;

      if (!isOwner && !isAdmin) {
        throw new Error("Unauthorized");
      }
      return eventData;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-bold mb-4">
          Event Not Found or Unauthorized
        </h1>
        <Link to="/my-events">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/50">
      {/* Premium Dashboard Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 md:top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Link to={`/events/${event.slug}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-accent/10 hover:bg-accent/20"
                    aria-label="Action"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Registration Dashboard
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                {event.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* We pass a prop or just let OrganizerRegistrations render. 
              Since OrganizerRegistrations renders a Card, it will fit nicely in this layout.
          */}
          <OrganizerRegistrations eventId={event.id} eventSlug={event.slug} />
        </motion.div>
      </div>
    </div>
  );
}
