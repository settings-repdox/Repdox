import { useEffect, useState } from "react";
import {
  useParams,
  Link,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCountdown } from "@/hooks/useCountdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Copy,
  Check,
  Trash2,
  Edit,
  Instagram,
  ChevronRight,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  formatDateWithOptions,
} from "@/lib/timeUtils";
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
import eventService from "@/lib/eventService";
import OrganizerRegistrations from "@/components/OrganizerRegistrations";
import { getSignedUrl } from "@/lib/storageService";
import { getEventImage } from "@/lib/eventImages";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import AddToCalendar from "@/components/AddToCalendar";
import RecentlyViewedEvents from "@/components/RecentlyViewedEvents";

export default function EventDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    role: "",
  });

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data, error } = await eventService.getEventBySlug(slug);
      if (error || !data) throw new Error("Event not found");

      // --- LOGIC START: EXPIRED ACCESS CONTROL ---
      const now = new Date();
      const isExpired = new Date(data.end_at) < now;

      // Check if the current user is the owner
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isOwner = user && data.created_by === user.id;

      // If expired and NOT the owner, block access
      if (isExpired && !isOwner) {
        throw new Error("This event has ended and is no longer public.");
      }

      // Block inactive events for non-owners (keep your existing logic)
      if (!data.is_active && !isOwner) {
        throw new Error("Event not found");
      }
      return data;
    },
    retry: false,
  });

  const countdown = useCountdown(event?.start_at || "");
  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null,
  );
  const [isRegistered, setIsRegistered] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});

  // Check if current user owns this event OR is registered
  useEffect(() => {
    const checkUserStatus = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser && event?.id) {
        const { data: reg, error } = await supabase
          .from("event_registrations")
          .select("id")
          .eq("event_id", event.id)
          .eq("user_id", currentUser.id)
          .maybeSingle();
        
        if (reg) setIsRegistered(true);
      }
    };
    checkUserStatus();
  }, [event?.id]);

  const isOwner = user && event?.created_by === user.id;

  // Fetch per-role registration counts to show remaining capacity
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (event?.id) {
          const counts = await eventService.countRegistrationsByRole(event.id);
          if (mounted) setRoleCounts(counts);
        }
      } catch (e) {
        // ignore errors for now
      }
    })();
    return () => {
      mounted = false;
    };
  }, [event?.id]);

  useEffect(() => {
    if (window.location.hash === "#register") {
      const element = document.getElementById("register");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [event, isLoading]);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!event?.id) return;

    try {
      await eventService.deleteEvent(event.id);
      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully",
      });
      navigate("/my-events");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete event";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };
  const rawTab = searchParams.get("tab") || "details";
  const activeTab = (rawTab === "registrations" || rawTab === "teams") && !isOwner ? "details" : rawTab;

  const setTab = (tab: string) => {
    const p = new URLSearchParams(searchParams);
    if (tab === "details") {
      p.delete("tab");
    } else {
      p.set("tab", tab);
    }
    setSearchParams(p);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Resolve image for private storage paths when needed
  const [heroImageSrc, setHeroImageSrc] = useState<string | undefined>(
    event?.image_url ? getEventImage(event.image_url) : undefined,
  );
  useEffect(() => {
    if (event) {
      try {
        const stored = localStorage.getItem("recentlyViewedEvents");
        let recent: unknown[] = stored ? JSON.parse(stored) : [];

        // Remove if already exists
        recent = recent.filter(
          (e: unknown) => (e as Record<string, unknown>)?.id !== event.id,
        );

        // Add to front
        recent.unshift({
          id: event.id,
          slug: event.slug,
          title: event.title,
          image_url: event.image_url,
          start_at: event.start_at,
          location: event.location,
          type: event.type,
          viewedAt: Date.now(),
        });

        // Keep only last 10
        recent = recent.slice(0, 10);

        localStorage.setItem("recentlyViewedEvents", JSON.stringify(recent));
      } catch (err) {
        console.error("Error saving recent event:", err);
      }
    }
  }, [event]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!event?.image_url) {
        setHeroImageSrc(undefined);
        return;
      }

      // 1. Check if it's an absolute URL
      if (/^https?:\/\//i.test(event.image_url)) {
        if (mounted) setHeroImageSrc(event.image_url);
        return;
      }

      // 2. Check if it's a known local asset mapping
      const mapped = getEventImage(event.image_url);
      // getEventImage returns the mapped asset if found, OR the publicUrl if not.
      // We only want to 'return' here if it's a local asset (not a publicUrl from storage).
      // Local assets in filenameMap don't have 'supabase' or 'storage' in their string usually.
      // But a better way is to check the filenameMap directly if we had access,
      // or just assume if it doesn't look like a storage path.

      const isKnownAsset =
        event.image_url.includes("event-hackathon") ||
        event.image_url.includes("event-mun") ||
        event.image_url.includes("event-workshop") ||
        event.image_url.includes("event-gaming") ||
        !event.image_url.includes("."); // internal vite assets often have hashes but maybe not extensions in some cases? No, usually they do.

      if (isKnownAsset && mounted) {
        setHeroImageSrc(mapped);
        return;
      }

      // 3. Try signed URL for private bucket
      try {
        const signed = await getSignedUrl(event.image_url, "event-images");
        if (mounted) {
          setHeroImageSrc(signed);
          return;
        }
      } catch (e) {
        console.warn(
          "[EventDetail] Failed to get signed URL, falling back to public URL",
          e,
        );
        // 4. Fallback to public URL via getEventImage
        if (mounted) setHeroImageSrc(mapped);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [event?.image_url]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Event link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch schedules and teams when needed
  const { data: rawSchedules = [] } = useQuery({
    queryKey: ["event_schedules", event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const { data, error } = await supabase
        .from("event_schedules")
        .select("*")
        .eq("event_id", event.id)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!event?.id && activeTab === "schedule",
  });

  const schedules = Array.from(
    new Map(
      rawSchedules.map((s) => [
        `${s.start_at}-${s.title}-${s.description}`,
        s,
      ]),
    ).values(),
  );

  const { data: rawTeams = [] } = useQuery({
    queryKey: ["event_teams", event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const { data, error } = await supabase
        .from("event_teams")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!event?.id && activeTab === "teams",
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["event_registrations_all", event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, name, message")
        .eq("event_id", event.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!event?.id && activeTab === "teams",
  });

  const teams = rawTeams.map(team => {
    const members = registrations.filter(r => {
      try {
        const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
        const teamName = msg.participation?.teamName || msg.teamName;
        return teamName && teamName.toLowerCase() === team.name.toLowerCase();
      } catch (e) {
        return false;
      }
    });
    return { ...team, members };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      try {
        // Check registration deadline
        if (event?.registration_deadline) {
          const deadline = new Date(event.registration_deadline);
          if (Date.now() > deadline.getTime()) {
            toast({
              title: "Registration closed",
              description: "Registration for this event is no longer open.",
              variant: "destructive",
            });
            return;
          }
        }

        // attempt to attach user if signed in
        const userResp = await supabase.auth.getUser();
        const user = userResp.data.user ?? null;

        // Check capacity if role selected
        if (formData.role) {
          const allowed = await eventService.canRegister(
            event.id,
            formData.role,
          );
          if (!allowed) {
            toast({
              title: "Registration full",
              description:
                "The selected role is full. Please choose another role or contact the organizer.",
              variant: "destructive",
            });
            return;
          }
        }

        const params = {
          event_id: event.id,
          user_id: user ? user.id : null,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          role: formData.role || null,
        };

        await eventService.registerForEvent(params);

        // Notify success without mentioning verification emails
        toast({
          title: "Registration submitted!",
        });
        setFormData({ name: "", email: "", phone: "", message: "", role: "" });
      } catch (err: unknown) {
        let msg =
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as Record<string, unknown>).message === "string"
            ? ((err as Record<string, unknown>).message as string)
            : String(err);

        // Map server-side error keys to friendly messages
        if (msg?.includes("role_full")) {
          msg =
            "The selected role is full. Please choose another role or contact the organizer.";
        } else if (msg?.includes("registration_closed")) {
          msg = "Registration for this event is closed.";
        } else if (msg?.includes("already_registered")) {
          msg = "You are already registered for this event.";
        }

        toast({
          title: "Registration failed",
          description: msg,
          variant: "destructive",
        });
      }
    })();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-96 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
        <Link to="/events">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  // Build structured data for the event (schema.org Event)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.start_at,
    endDate: event.end_at || undefined,
    eventAttendanceMode: (
      Array.isArray(event.format)
        ? event.format.includes("Online")
        : event.format === "Online"
    )
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: event.is_active
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventCancelled",
    location: (
      Array.isArray(event.format)
        ? event.format.includes("Online")
        : event.format === "Online"
    )
      ? {
          "@type": "VirtualLocation",
          url: event.registration_link || window.location.href,
        }
      : { "@type": "Place", name: event.location },
    image: event.image_url ? [event.image_url] : undefined,
    description: event.short_blurb || event.overview || event.long_description,
    organizer: event.organisers || undefined,
    keywords: Array.isArray(event.type) ? event.type.join(", ") : event.type,
    offers: event.registration_link
      ? { "@type": "Offer", url: event.registration_link }
      : undefined,
    url: window.location.href,
  };

  const roles = (event as unknown as { roles: unknown[] }).roles as
    | unknown[]
    | undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Hero */}
      <section className="relative h-[60vh] overflow-hidden">
        <img
          src={
            heroImageSrc ?? getEventImage(event?.image_url) ?? event?.image_url
          }
          alt={event?.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 pb-12">
            <div className="flex items-center justify-between mb-6">
              <Link to="/events">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Events
                </Button>
              </Link>

              {isOwner && (
                <div className="flex gap-2">
                  <Link to={`/events/${event.slug}/edit`}>
                    <Button variant="default" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Event
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-6">
              {Array.isArray(event.type) ? (
                <div className="flex flex-wrap gap-2">
                  {event.type.map((t) => (
                    <span
                      key={t}
                      className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <Badge className="bg-accent text-accent-foreground border-0 px-3 py-1 text-sm font-semibold">
                  {event.type}
                </Badge>
              )}
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-4 px-2 sm:px-0"
            >
              {event.title}
            </motion.h1>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 text-white bg-black/40 backdrop-blur-md w-fit px-6 py-3 rounded-2xl border border-white/10 font-mono text-lg shadow-xl"
            >
              <Clock className="h-5 w-5 text-purple-400 animate-pulse" />
              {countdown.isExpired ? (
                <span className="font-bold text-green-400">Event has started</span>
              ) : (
                <span className="font-medium">
                  Starts in{" "}
                  <span className="text-purple-400 font-bold">
                    {`${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`}
                  </span>
                </span>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Tabs */}
          <div className="mb-6 px-4 md:px-6">
            <div className="flex items-center gap-3 border-b border-border overflow-x-auto scrollbar-hide whitespace-nowrap">
              <button
                onClick={() => setTab("details")}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  activeTab === "details"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setTab("schedule")}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  activeTab === "schedule"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Event Schedule
              </button>
              {isOwner && (
                <button
                  onClick={() => setTab("teams")}
                  className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                    activeTab === "teams"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Teams
                </button>
              )}

              {isOwner && (
                <button
                  onClick={() => setTab("registrations")}
                  className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                    activeTab === "registrations"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Registrations
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {activeTab === "schedule" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Local Event Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {schedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No schedule available for this event.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {schedules.map(
                          (s: {
                            id: string;
                            start_at: string;
                            title: string;
                            description?: string;
                          }) => (
                            <li key={s.id} className="border rounded p-3">
                              <div className="text-sm text-muted-foreground">
                                {s.start_at ? formatDateTime(s.start_at) : ""}
                              </div>
                              <div className="font-medium">{s.title}</div>
                              {s.description && (
                                <div className="text-sm text-muted-foreground">
                                  {s.description}
                                </div>
                              )}
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              {isOwner && activeTab === "teams" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Teams</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No teams listed for this event.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {teams.map(
                          (t: {
                            id: string;
                            name: string;
                            description?: string;
                            contact_email?: string;
                            members?: any[];
                          }) => (
                            <div key={t.id} className="border border-border/50 bg-accent/5 rounded-xl p-6 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="font-bold text-lg text-accent">{t.name}</div>
                                <Badge variant="outline" className="text-xs">
                                  {t.members?.length || 0} members
                                </Badge>
                              </div>
                              
                              {t.description && (
                                <div className="text-sm text-muted-foreground italic">
                                  "{t.description}"
                                </div>
                              )}

                              <div className="space-y-2">
                                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Users className="w-3 h-3" /> Team Members
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {t.members && t.members.length > 0 ? (
                                    t.members.map((m) => (
                                      <Badge key={m.id} variant="secondary" className="bg-background/50">
                                        {m.name}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">No members found</span>
                                  )}
                                </div>
                              </div>
                              
                              {t.contact_email && (
                                <div className="pt-2 text-xs text-muted-foreground border-t border-border/30">
                                  Contact: {t.contact_email}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {isOwner && activeTab === "registrations" && (
                <div>
                  {/* Organizer Registrations component will fetch registrations and provide exports */}
                  <OrganizerRegistrations eventId={event.id} />
                </div>
              )}

              {activeTab === "details" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {event.overview ||
                          event.long_description ||
                          event.short_blurb}
                      </p>

                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {event.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="border-accent/30"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* FAQs */}
                  {event.faqs &&
                    Array.isArray(event.faqs) &&
                    event.faqs.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>FAQs</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Accordion type="single" collapsible>
                            {(
                              event.faqs as unknown as Array<{
                                question: string;
                                answer: string;
                              }>
                            ).map((faq, index) => (
                              <AccordionItem key={index} value={`faq-${index}`}>
                                <AccordionTrigger>
                                  {faq.question}
                                </AccordionTrigger>
                                <AccordionContent>
                                  {faq.answer}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </CardContent>
                      </Card>
                    )}

                  {/* Registration Form */}
                  {(() => {
                    const now = new Date();
                    const registrationStart = event.registration_start
                      ? new Date(event.registration_start)
                      : null;
                    const registrationDeadline = event.registration_deadline
                      ? new Date(event.registration_deadline)
                      : null;

                    // Check if registration is open
                    const isBeforeStart =
                      registrationStart && now < registrationStart;
                    const isAfterDeadline =
                      registrationDeadline && now > registrationDeadline;

                    if (isBeforeStart) {
                      const formattedDate = registrationStart
                        ? formatDate(registrationStart)
                        : "";
                      return (
                        <Card>
                          <CardHeader>
                            <CardTitle>Register Now</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Registration opens on {formattedDate} at{" "}
                              {registrationStart?.toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    }

                    if (isAfterDeadline) {
                      return (
                        <Card>
                          <CardHeader>
                            <CardTitle>Registration Closed</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Registration for this event has closed.
                            </p>
                          </CardContent>
                        </Card>
                      );
                    }

                    if (event.registration_link) {
                      const isExternal = /^https?:\/\//i.test(event.registration_link);
                      return (
                        <Card id="register" className="border-accent/50 bg-accent/5 shadow-lg shadow-accent/10">
                          <CardHeader>
                            <CardTitle>Register Now</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <p className="text-muted-foreground leading-relaxed">
                              Registration for this event is managed through an official portal. Click the button below to secure your spot.
                            </p>
                            {isExternal ? (
                              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-6 rounded-xl">
                                <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                                  Go to Registration Portal <ChevronRight className="ml-2 h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Link to={event.registration_link}>
                                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-6 rounded-xl">
                                  Go to Registration Portal <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }

                    const lowerSlug = event.slug?.toLowerCase() || "";
                    if (lowerSlug.includes("solveforindia") || lowerSlug.includes("solve-for-india")) {
                      return (
                        <motion.div 
                          id="register"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          className="relative group mt-8"
                        >
                          {/* Iridescent Glow Background */}
                          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan opacity-25 blur group-hover:opacity-40 transition duration-1000 group-hover:duration-200 rounded-[2rem]" />
                          
                          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-12 overflow-hidden shadow-2xl">
                            {/* Ambient background accent */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] -mr-32 -mt-32 rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] -ml-32 -mb-32 rounded-full pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                              <div className="flex-1 text-center md:text-left">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 uppercase tracking-widest mb-4">
                                  Official Innovation Portal
                                </span>
                                <h2 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
                                  {isRegistered ? (
                                    <>Review Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-cyan">Application</span></>
                                  ) : (
                                    <>Ready to <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-cyan">Create Impact?</span></>
                                  )}
                                </h2>
                                <p className="text-gray-400 text-lg max-w-xl mx-auto md:mx-0 leading-relaxed">
                                  {isRegistered 
                                    ? "Your registration is active. Access the portal to review your team and project details."
                                    : "Join the largest student-driven innovation race in India. Build, transform, and win big."}
                                </p>
                              </div>

                              <div className="flex-shrink-0 w-full md:w-auto">
                                <Link to="/solve-for-india/register">
                                  <Button className="group/btn relative w-full md:w-[280px] h-20 bg-white text-black hover:text-white rounded-[20px] font-black text-lg overflow-hidden transition-all duration-300 shadow-xl shadow-white/5">
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                      {isRegistered ? "Portal Access" : "Join Now"}
                                      <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                  </Button>
                                </Link>
                              </div>
                            </div>

                            {/* Decorative Grid Pattern */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.05] pointer-events-none" />
                          </div>
                        </motion.div>
                      );
                    }

                    return (
                      <Card id="register">
                        <CardHeader>
                          <CardTitle>Register Now</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                              <Label htmlFor="name">Name</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    name: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    email: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="phone">Phone</Label>
                              <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    phone: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>

                            {roles &&
                              Array.isArray(roles) &&
                              roles.length > 0 && (
                                <div>
                                  <Label htmlFor="role">Role</Label>
                                  <select
                                    id="role"
                                    value={formData.role}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        role: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                  >
                                    <option value="">
                                      Select a role (optional)
                                    </option>
                                    {(roles as unknown[]).map(
                                      (r: unknown, i: number) => {
                                        const obj = r as Record<
                                          string,
                                          unknown
                                        >;
                                        const name =
                                          typeof r === "string"
                                            ? (r as string)
                                            : typeof obj.name === "string"
                                              ? (obj.name as string)
                                              : typeof obj.role === "string"
                                                ? (obj.role as string)
                                                : `Role ${i + 1}`;
                                        const capacityNum =
                                          typeof obj.capacity === "number"
                                            ? (obj.capacity as number)
                                            : null;
                                        let label = name;
                                        if (capacityNum != null) {
                                          const used = roleCounts[name] || 0;
                                          const remaining = capacityNum - used;
                                          label = `${name} (cap ${capacityNum}${remaining <= 0 ? ", full" : `, ${remaining} remaining`})`;
                                        }
                                        return (
                                          <option key={i} value={name}>
                                            {label}
                                          </option>
                                        );
                                      },
                                    )}
                                  </select>
                                </div>
                              )}

                            <div>
                              <Label htmlFor="message">
                                Why do you want to attend?
                              </Label>
                              <Textarea
                                id="message"
                                value={formData.message}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    message: e.target.value,
                                  })
                                }
                                rows={4}
                              />
                            </div>
                            <Button type="submit" className="w-full">
                              Submit Registration
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-accent mt-0.5" />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateWithOptions(event.start_at, {
                          weekday: true,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.start_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {event.location && event.location.trim() && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-accent mt-0.5" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">
                          {event.location}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {Array.isArray(event.format)
                            ? event.format.join(" / ")
                            : String(event.format)}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={copyLink}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Link
                        </>
                      )}
                    </Button>

                    <AddToCalendar event={event} />

                    {event.discord_invite && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        asChild
                      >
                        <a
                          href={event.discord_invite}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Users className="h-4 w-4" />
                          Join Discord
                        </a>
                      </Button>
                    )}

                    {event.instagram_handle && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        asChild
                      >
                        <a
                          href={`https://instagram.com/${event.instagram_handle.replace(
                            "@",
                            "",
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Instagram className="h-4 w-4" />
                          Follow on Instagram
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <RecentlyViewedEvents />

              {/* Prizes */}
              {event.prizes &&
                Array.isArray(event.prizes) &&
                event.prizes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Prizes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {event.prizes.map((prize: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="text-accent">•</span>
                            <span className="text-sm">{prize}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate your event. It will no longer be visible to
              other users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
