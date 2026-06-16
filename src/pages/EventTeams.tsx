import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import OrganizerTeams from "@/components/OrganizerTeams";
import eventService from "@/lib/eventService";
import { motion } from "framer-motion";
import { ADMIN_EMAILS } from "@/lib/adminService";

export default function EventTeams() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data, error } = await eventService.getEventBySlug(slug);
      if (error || !data) throw new Error("Event not found");

      const { data: { user } } = await supabase.auth.getUser();
      const isOwner = user && data.created_by === user.id;
      const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

      if (!isOwner && !isAdmin) {
        throw new Error("Unauthorized");
      }
      return data;
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
        <h1 className="text-4xl font-bold mb-4">Event Not Found or Unauthorized</h1>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-accent/10 hover:bg-accent/20" aria-label="Action">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Teams Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                {event.title}
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Link to={`/events/${event.slug}/registrations`}>
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
                  <Users className="mr-2 h-4 w-4" />
                  View Registrations
                </Button>
              </Link>
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
          <OrganizerTeams eventId={event.id} eventSlug={event.slug} />
        </motion.div>
      </div>
    </div>
  );
}
