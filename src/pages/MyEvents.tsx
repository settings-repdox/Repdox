import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { registerDefaults } from "@/core/services/registerDefaults";
import { resolveService } from "@/core/services/di";
import type { IEventService } from "@/domains/events/interfaces/IEventService";
import { formatDate } from "@/lib/timeUtils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  MapPin,
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getEventImage } from "@/lib/eventImages";

registerDefaults();

const eventServiceCore = () => resolveService<IEventService>("EventService");

export default function MyEvents() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const {
    data: userEvents = [],
    isLoading: isEventsLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", user!.id);

      if (error) throw error;

      const now = new Date();

      return (data || []).sort((a, b) => {
        const isAExpired = new Date(a.end_at) < now;
        const isBExpired = new Date(b.end_at) < now;

        if (isAExpired !== isBExpired) {
          return isAExpired ? 1 : -1;
        }

        if (isAExpired && isBExpired) {
          return new Date(b.end_at).getTime() - new Date(a.end_at).getTime();
        }

        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
      });
    },
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your events",
          variant: "destructive",
        });
        navigate("/signin");
      } else {
        setUser(user);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    try {
      await eventService().deleteEvent(eventToDelete);
      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully",
      });
      refetch();
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  if (isEventsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-grow py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 -ml-2 text-muted-foreground"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <h1 className="text-4xl font-bold tracking-tight">My Events</h1>
              <p className="text-muted-foreground mt-2">
                Manage your events. Past events are hidden from the public.
              </p>
            </div>
            <Button asChild className="bg-accent hover:bg-accent/90">
              <Link to="/create-event">
                <Plus className="w-4 h-4 mr-2" /> Create New Event
              </Link>
            </Button>
          </div>

          {/* Events Grid */}
          {isEventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-80 bg-muted animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : userEvents.length === 0 ? (
            <Card className="p-12 text-center border-dashed bg-muted/20">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No events yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by creating your first event!
              </p>
              <Button asChild>
                <Link to="/create-event">Create Event</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userEvents.map((event) => {
                const isExpired = new Date(event.end_at) < new Date();

                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card
                      className={`h-full flex flex-col transition-all duration-300 ${
                        isExpired
                          ? "opacity-50 grayscale bg-muted/30 border-dashed ring-0 shadow-none"
                          : "hover:shadow-md"
                      }`}
                    >
                      <CardHeader className="p-0 relative">
                        {isExpired && (
                          <div className="absolute inset-0 z-10 bg-background/20 backdrop-blur-[1px] flex items-center justify-center">
                            <Badge
                              variant="secondary"
                              className="font-bold border-muted-foreground/50"
                            >
                              <Clock className="w-3 h-3 mr-1" /> EXPIRED
                            </Badge>
                          </div>
                        )}
                        <div className="aspect-video w-full overflow-hidden rounded-t-xl">
                          <img
                            src={
                              getEventImage(event.image_url) ||
                              event.image_url ||
                              "/placeholder.png"
                            }
                            alt={event.title}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 flex-grow">
                        <div className="flex justify-between items-start mb-3">
                          <CardTitle className="text-xl line-clamp-1">
                            {event.title}
                          </CardTitle>
                          {!event.is_active && !isExpired && (
                            <Badge
                              variant="secondary"
                              className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                            >
                              Pending Approval
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(event.start_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">
                              {event.location}
                            </span>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="p-5 pt-0 flex flex-col gap-3">
                        <div className="w-full flex gap-2">
                          {isExpired ? (
                            <div className="w-full p-2 bg-muted/50 rounded-md">
                              <p className="text-[10px] text-muted-foreground italic text-center">
                                Hidden from public view. Permanent deletion in 3
                                months.
                              </p>
                            </div>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                asChild
                              >
                                <Link to={`/events/${event.slug}/edit`}>
                                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                                </Link>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(event.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs"
                            asChild
                          >
                            <Link to={`/events/${event.slug}/registrations`}>
                              Registrations
                            </Link>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs"
                            asChild
                          >
                            <Link to={`/events/${event.slug}/teams`}>
                              Teams
                            </Link>
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          asChild
                        >
                          <Link to={`/events/${event.slug}`}>
                            View Event Page
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the event from everyone else. This action is
              permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
