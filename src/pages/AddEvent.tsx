import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  GripVertical,
  CalendarDays,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  FileText,
  List,
  HelpCircle,
  ChevronLeft,
  Save,
  Eye,
  Rocket,
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import eventService from "@/lib/eventService";
import FileUpload from "@/components/ui/File_upload";

import EventBuilderExtensions from "@/components/EventBuilder/EventBuilderExtensions";
import LivePreview from "@/components/EventBuilder/LivePreview";
import EventCardPreview from "@/components/EventBuilder/EventCardPreview";
import useAutoSave from "@/hooks/useAutoSave";
import type { EventDraft } from "@/components/EventBuilder/LivePreview";
import {
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
  Select,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Suggested tags based on common event categories
const SUGGESTED_TAGS = [
  "Technology",
  "Innovation",
  "AI/ML",
  "Blockchain",
  "Web Development",
  "Mobile Apps",
  "Gaming",
  "Design",
  "UI/UX",
  "Prizes",
  "Networking",
  "Workshop",
  "Beginner Friendly",
  "Open Source",
  "Hardware",
  "IoT",
  "Data Science",
  "Cybersecurity",
  "Cloud Computing",
  "Startup",
];

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function AddEvent() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!slug;

  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "Hackathon",
    format: "Offline",
    start_date: "",
    start_time: "09:00",
    end_date: "",
    end_time: "18:00",
    registration_start_date: "",
    registration_start_time: "00:00",
    registration_deadline_date: "",
    registration_deadline_time: "23:59",
    location: "",
    short_blurb: "",
    long_description: "",
    overview: "",
    rules: "",
    registration_link: "",
    discord_invite: "",
    instagram_handle: "",
  });

  const [scheduleText, setScheduleText] = useState("");
  const [teamsText, setTeamsText] = useState("");
  const [prizeText, setPrizeText] = useState("");
  const [committeesText, setCommitteesText] = useState("");

  // FAQ state management (start empty; user can opt-in)
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showFaqs, setShowFaqs] = useState(false);
  const [draggedFaq, setDraggedFaq] = useState<string | null>(null);

  // Tag state management
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ file: File; name: string }>
  >([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Optional sections and enhanced draft state (for Live Preview & reordering)
  const [speakers, setSpeakers] = useState<
    Array<{ id: string; name: string; role?: string }>
  >([]);
  const [resources, setResources] = useState<
    Array<{ id: string; title: string; link?: string }>
  >([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [rolesText, setRolesText] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"split" | "full">("split");
  const [publishLater, setPublishLater] = useState(false);
  const [publish_date, setPublishDate] = useState("");
  const [publish_time, setPublishTime] = useState("09:00");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Autosave draft states
  const [canAutoSave, setCanAutoSave] = useState(false);
  const [savedDraftAvailable, setSavedDraftAvailable] = useState<{
    payload?: EventDraft;
    savedAt?: number;
  } | null>(null);

  // Autosave draft hook
  const draftKey = `event-draft:${slug ?? "new"}`;
  const [draft, setDraft] = useState<EventDraft>({
    id: eventId ?? undefined,
    title: "",
    description: "",
    date: "",
    location: "",
    tags: [],
    sections: [],
  });
  const {
    state: draftSaveState,
    load: loadDraft,
    manualSave: manualSaveDraft,
    clear: clearDraft,
  } = useAutoSave<EventDraft>(draftKey, draft, {
    debounceMs: 700,
    enabled: canAutoSave,
  });

  // Helpers for date/time constraints
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const startTimeMin = form.start_date === todayStr ? nowTime : "00:00";
  const endDateMin = form.start_date || todayStr;
  const regDateMin = todayStr;
  const regDateMax = form.start_date || undefined;
  const regTimeMax =
    form.registration_deadline_date === form.start_date && form.start_time
      ? ((): string => {
          const [h, m] = form.start_time.split(":").map(Number);
          let total = h * 60 + m - 1;
          if (total < 0) total = 0;
          const hh = String(Math.floor(total / 60)).padStart(2, "0");
          const mm = String(total % 60).padStart(2, "0");
          return `${hh}:${mm}`;
        })()
      : undefined;

  // Mobile pane toggle: 'fields' or 'preview' (small screens)
  const [mobilePane, setMobilePane] = useState<"fields" | "preview">("fields");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // toggle only on small screens
      if (window.innerWidth >= 1024) return;
      if (e.key.toLowerCase() === "p") {
        setMobilePane((m) => (m === "preview" ? "fields" : "preview"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const checkProfileAndLoad = async () => {
      setLoadingEvent(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/signin");
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!profile) {
          setProfileComplete(false);
          setMissingFields(["Full profile record"]);
        } else {
          const fields = [
            { key: "full_name", label: "Full Name", value: profile.full_name },
            { key: "date_of_birth", label: "Date of Birth", value: profile.date_of_birth },
            { key: "bio", label: "Bio", value: profile.bio },
            { key: "avatar_url", label: "Profile Picture", value: profile.avatar_url },
            { key: "phone", label: "Phone Number", value: profile.phone },
            { key: "website", label: "Website", value: profile.website },
            { key: "company", label: "Company", value: profile.company },
            { key: "job_title", label: "Job Title", value: profile.job_title },
          ];

          const missing = fields.filter(
            (field) => !field.value || field.value.toString().trim() === ""
          );

          if (missing.length > 0) {
            setProfileComplete(false);
            setMissingFields(missing.map(f => f.label));
          } else {
            setProfileComplete(true);
          }
        }
      } catch (err) {
        console.error("Profile check error:", err);
      } finally {
        if (!isEditMode) setLoadingEvent(false);
      }
    };

    checkProfileAndLoad();
  }, [navigate, isEditMode]);

  // Load event data if in edit mode
  useEffect(() => {
    if (!isEditMode || !slug) return;

    const loadEvent = async () => {
      try {
        const { data: event, error } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .single();

        if (error) throw error;

        // Check if user owns this event
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (event.created_by !== user?.id) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to edit this event",
            variant: "destructive",
          });
          navigate("/events");
          return;
        }

        setEventId(event.id);

        // Parse dates
        const startDate = new Date(event.start_at);
        const endDate = new Date(event.end_at);
        const regDeadline = new Date(event.registration_deadline);

        // Populate form
        setForm({
          title: event.title || "",
          slug: event.slug || "",
          type: String(event.type || "Hackathon"),
          format: String(event.format || "Offline"),
          start_date: startDate.toISOString().split("T")[0],
          start_time: startDate.toTimeString().slice(0, 5),
          end_date: endDate.toISOString().split("T")[0],
          end_time: endDate.toTimeString().slice(0, 5),
          registration_start_date: "",
          registration_start_time: "00:00",
          registration_deadline_date: regDeadline.toISOString().split("T")[0],
          registration_deadline_time: regDeadline.toTimeString().slice(0, 5),
          location: event.location || "",
          short_blurb: event.short_blurb || "",
          long_description: event.long_description || "",
          overview: event.overview || "",
          rules: event.rules || "",
          registration_link: event.registration_link || "",
          discord_invite: event.discord_invite || "",
          instagram_handle: event.instagram_handle || "",
        });

        // Set tags
        if (event.tags) setTags(event.tags);

        // attempt to set cover image if event provides one (some events may use different property names)
        const getEventCover = (ev: unknown): string | null => {
          if (!ev || typeof ev !== "object") return null;
          const e = ev as Record<string, unknown>;
          if (typeof e["cover_url"] === "string")
            return e["cover_url"] as string;
          if (typeof e["image_url"] === "string")
            return e["image_url"] as string;
          if (typeof e["cover"] === "string") return e["cover"] as string;
          return null;
        };
        setCoverUrl(getEventCover(event));

        // Set prizes
        if (event.prizes && Array.isArray(event.prizes)) {
          setPrizeText(event.prizes.join("\n"));
        }

        // Set FAQs
        if (event.faqs && Array.isArray(event.faqs)) {
          const loadedFaqs = (
            event.faqs as Array<{ question?: string; answer?: string }>
          ).map((f, idx: number) => ({
            id: `faq-${idx}`,
            question: f?.question || "",
            answer: f?.answer || "",
          }));
          if (loadedFaqs.length > 0) {
            setFaqs(loadedFaqs);
            setShowFaqs(true);
            // add to section order
            setSectionOrder((s) => (s.includes("FAQs") ? s : [...s, "FAQs"]));
          }
        }

        // Load schedules
        const { data: schedules } = await supabase
          .from("event_schedules")
          .select("*")
          .eq("event_id", event.id)
          .order("start_at", { ascending: true });

        if (schedules && schedules.length > 0) {
          const seen = new Set<string>();
          const scheduleLines: string[] = [];
          
          schedules.forEach((s) => {
            const start = s.start_at
              ? new Date(s.start_at).toISOString().slice(0, 19) + "Z"
              : "";
            const line = `${start} | ${s.title} | ${s.description || ""}`;
            if (!seen.has(line)) {
              seen.add(line);
              scheduleLines.push(line);
            }
          });
          
          setScheduleText(scheduleLines.join("\n"));
          setSectionOrder((s) => (s.includes("Agenda") ? s : [...s, "Agenda"]));
        }

        // Load teams
        const { data: teams } = await supabase
          .from("event_teams")
          .select("*")
          .eq("event_id", event.id);

        if (teams && teams.length > 0) {
          const seen = new Set<string>();
          const teamLines: string[] = [];
          
          teams.forEach((t) => {
            const line = `${t.name} | ${t.description || ""} | ${t.contact_email || ""}`;
            if (!seen.has(line)) {
              seen.add(line);
              teamLines.push(line);
            }
          });
          
          setTeamsText(teamLines.join("\n"));
        }
      } catch (err: unknown) {
        console.error("Failed to load event:", err);
        const message = err instanceof Error ? err.message : String(err);
        toast({
          title: "Error Loading Event",
          description: message,
          variant: "destructive",
        });
        navigate("/events");
      } finally {
        setLoadingEvent(false);
      }
    };

    loadEvent();
  }, [isEditMode, slug, navigate]);

  const onChange = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));

  // keep `draft` in sync with the main form and extras (for preview / autosave)
  useEffect(() => {
    // Construct sections dynamically based on content
    const secs: EventDraft["sections"] = [];

    if (scheduleText)
      secs.push({
        id: "agenda",
        type: "Agenda",
        title: "Agenda",
        content: scheduleText,
      });
    if (speakers.length > 0)
      secs.push({
        id: "speakers",
        type: "Speakers",
        title: "Speakers",
        content: JSON.stringify(speakers),
      });
    if (teamsText && form.type !== "Hackathon")
      secs.push({
        id: "teams",
        type: "Teams",
        title: "Teams",
        content: teamsText,
      });
    if (committeesText && form.type === "MUN")
      secs.push({
        id: "committees",
        type: "Committees",
        title: "Committees",
        content: committeesText,
      });
    if (prizeText)
      secs.push({
        id: "prizes",
        type: "Prizes",
        title: "Prizes & Awards",
        content: prizeText,
      });
    if (rolesText)
      secs.push({
        id: "roles",
        type: "Roles",
        title: "Participant Roles",
        content: rolesText,
      });
    if (faqs.length > 0)
      secs.push({
        id: "faqs",
        type: "FAQs",
        title: "FAQs",
        content: JSON.stringify(faqs),
      });
    if (resources.length > 0)
      secs.push({
        id: "resources",
        type: "Resources",
        title: "Resources",
        content: JSON.stringify(resources),
      });

    setDraft({
      id: eventId ?? undefined,
      title: form.title,
      description: form.short_blurb || form.overview || form.long_description,
      date: form.start_date ? `${form.start_date}T${form.start_time}` : "",
      location: form.location,
      cover: coverUrl || draft?.cover,
      start_at: form.start_date,
      end_at: form.end_date,
      type: form.type,
      format: form.format,
      registration_start:
        form.registration_start_date && form.registration_start_time
          ? `${form.registration_start_date}T${form.registration_start_time}`
          : form.registration_start_date || "",
      registration_end:
        form.registration_deadline_date && form.registration_deadline_time
          ? `${form.registration_deadline_date}T${form.registration_deadline_time}`
          : form.registration_deadline_date || "",
      tags,
      sections: secs,
    });
  }, [
    form,
    tags,
    scheduleText,
    faqs,
    speakers,
    resources,
    teamsText,
    prizeText,
    rolesText,
    committeesText,
    eventId,
    coverUrl,
  ]);

  // make saved draft available to restore (once)
  useEffect(() => {
    const existing = loadDraft();
    if (existing && existing.payload) {
      setSavedDraftAvailable(existing);
    } else {
      // If no draft exists, we can start autosaving fresh
      setCanAutoSave(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime validation: clear errors as fields are fixed
  useEffect(() => {
    setErrors((prev) => {
      const next = { ...prev };
      if (form.title && next.title) delete next.title;
      if (form.start_date && form.start_time && next.start) delete next.start;
      if (form.location && next.location) delete next.location;
      return next;
    });
  }, [form.title, form.start_date, form.start_time, form.location]);

  const restoreDraft = () => {
    if (!savedDraftAvailable?.payload) return;
    const p = savedDraftAvailable.payload;
    setForm((s) => ({
      ...s,
      title: p.title || s.title,
      short_blurb: p.description || s.short_blurb,
      location: p.location || s.location,
    }));
    setTags(p.tags || []);

    // reconstruct extras
    const order: string[] = [];
    const sp: typeof speakers = [];
    const res: typeof resources = [];
    let sched = "";
    let fqs: FAQ[] = [];

    (p.sections || []).forEach((sec) => {
      order.push(sec.type);
      try {
        if (sec.type === "Agenda")
          sched =
            typeof sec.content === "string" ? (sec.content as string) : "";
        if (sec.type === "FAQs")
          fqs =
            typeof sec.content === "string"
              ? JSON.parse(sec.content)
              : sec.content || [];
        if (sec.type === "Speakers") {
          const parsed = (
            typeof sec.content === "string"
              ? JSON.parse(sec.content)
              : sec.content || []
          ) as Array<{ name?: string; role?: string }>;
          parsed.forEach((s, i: number) =>
            sp.push({
              id: `sp-${i}`,
              name: s?.name || "",
              role: s?.role || "",
            }),
          );
        }
        if (sec.type === "Resources") {
          const parsed = (
            typeof sec.content === "string"
              ? JSON.parse(sec.content)
              : sec.content || []
          ) as Array<{ title?: string; link?: string }>;
          parsed.forEach((r, i: number) =>
            res.push({
              id: `r-${i}`,
              title: r?.title || "",
              link: r?.link || "",
            }),
          );
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    if (sched) {
      // Dedup restored schedule lines
      const uniqueSched = Array.from(new Set(sched.split(/\r?\n/).map(l => l.trim()).filter(Boolean))).join("\n");
      setScheduleText(uniqueSched);
    }
    if (fqs && fqs.length) {
      setFaqs(fqs);
      setShowFaqs(true);
    }
    if (sp.length) setSpeakers(sp);
    if (res.length) setResources(res);
    if (order.length) setSectionOrder(order);

    // clear the saved-draft banner and enable autosave
    setSavedDraftAvailable(null);
    setCanAutoSave(true);
  };

  const dismissSavedDraft = () => {
    setSavedDraftAvailable(null);
    setCanAutoSave(true);
  };

  // FAQ handlers
  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now().toString(), question: "", answer: "" }]);
  };

  const removeFaq = (id: string) => {
    if (faqs.length > 1) {
      setFaqs(faqs.filter((f) => f.id !== id));
    }
  };

  const updateFaq = (
    id: string,
    field: "question" | "answer",
    value: string,
  ) => {
    setFaqs(faqs.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const handleDragStart = (id: string) => {
    setDraggedFaq(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedFaq || draggedFaq === id) return;

    const draggedIndex = faqs.findIndex((f) => f.id === draggedFaq);
    const targetIndex = faqs.findIndex((f) => f.id === id);

    const newFaqs = [...faqs];
    const [removed] = newFaqs.splice(draggedIndex, 1);
    newFaqs.splice(targetIndex, 0, removed);
    setFaqs(newFaqs);
  };

  const handleDragEnd = () => {
    setDraggedFaq(null);
  };

  // Tag handlers
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    if (value.trim()) {
      const filtered = SUGGESTED_TAGS.filter(
        (tag) =>
          tag.toLowerCase().includes(value.toLowerCase()) &&
          !tags.includes(tag),
      );
      setFilteredSuggestions(filtered);
      setShowTagSuggestions(true);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    const duplicate = tags.find(
      (t) => t.toLowerCase() === trimmedTag.toLowerCase(),
    );
    if (duplicate) {
      toast({
        title: "Duplicate Tag",
        description: `"${duplicate}" already exists.`,
        variant: "destructive",
      });
      return;
    }

    setTags([...tags, trimmedTag]);
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSubmit = async () => {
    if (profileComplete === false) {
      toast({
        title: "Profile Incomplete",
        description: "Please complete your profile 100% to host events.",
        variant: "destructive",
      });
      return;
    }

    // Run validation
    const nextErrors: Record<string, string> = {};
    if (!form.title || !form.title.trim())
      nextErrors.title = "Please enter an event title.";
    if (!form.start_date || !form.start_time)
      nextErrors.start = "Start date and time are required.";

    // Date/time validation: start cannot be in the past
    try {
      const startAt = new Date(`${form.start_date}T${form.start_time}`);
      if (startAt.getTime() < Date.now()) {
        nextErrors.start = "Event start must be in the future.";
      }

      if (form.end_date && form.end_time) {
        const endAt = new Date(`${form.end_date}T${form.end_time}`);
        if (endAt.getTime() <= startAt.getTime()) {
          nextErrors.end = "End time must be after start time.";
        }
      }

      if (form.registration_deadline_date && form.registration_deadline_time) {
        const regDead = new Date(
          `${form.registration_deadline_date}T${form.registration_deadline_time}`,
        );
        if (regDead.getTime() >= startAt.getTime()) {
          nextErrors.registration_deadline =
            "Registration deadline must be before the event start.";
        }
      }
    } catch (err) {
      // ignore parse errors here; other validations will catch
    }
    if (!form.location || !form.location.trim())
      nextErrors.location = "Venue or platform is required.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted errors before submitting.",
        variant: "destructive",
      });
      // focus first error if possible
      const first = Object.keys(nextErrors)[0];
      const el = document.getElementById(
        first === "title"
          ? "title"
          : first === "location"
            ? "location"
            : undefined,
      );
      el?.focus();
      return;
    }

    setLoading(true);
    try {
      const parsedRoles = rolesText
        ? rolesText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .map((line) => {
              const [name, cap] = line.split("|").map((p) => p.trim());
              return { name, capacity: cap ? parseInt(cap, 10) || null : null };
            })
        : null;

      const payloadBase = {
        form,
        tags,
        scheduleText,
        teamsText,
        prizeText,
        faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
        uploadedFiles,
        roles: parsedRoles && parsedRoles.length ? parsedRoles : null,
      };

      const payload =
        publishLater && publish_date
          ? {
              ...payloadBase,
              publish_at: new Date(
                `${publish_date}T${publish_time}`,
              ).toISOString(),
            }
          : payloadBase;

      if (isEditMode && eventId) {
        // Update existing event
        const updated = await eventService.updateEvent(eventId, payload);
        toast({
          title: "Success",
          description: "Event updated successfully!",
        });
        // Bust the React Query cache to ensure fresh data
        queryClient.invalidateQueries({
          queryKey: ["event_schedules", eventId],
        });
        queryClient.invalidateQueries({ queryKey: ["event_teams", eventId] });
        if (updated?.slug) {
          navigate(`/events/${updated.slug}`);
        } else {
          navigate("/my-events");
        }
      } else {
        // Create new event
        const created = await eventService.createEvent(payload);
        toast({
          title: "Success",
          description: "Event created successfully!",
        });
        if (created?.slug) {
          navigate(`/events/${created.slug}`);
        } else {
          navigate("/my-events");
        }
      }

      // clear autosave on successful publish
      clearDraft();
    } catch (err: unknown) {
      console.error(
        isEditMode ? "Update event failed" : "Create event failed",
        err,
      );
      let message = "Unknown error";
      try {
        if (err instanceof Error) {
          try {
            const parsed = JSON.parse((err as Error).message);
            if (
              parsed &&
              typeof parsed === "object" &&
              "message" in (parsed as Record<string, unknown>)
            ) {
              const maybeMessage = (parsed as Record<string, unknown>)[
                "message"
              ];
              message =
                typeof maybeMessage === "string"
                  ? maybeMessage
                  : (err as Error).message;
            } else {
              message = (err as Error).message;
            }
          } catch {
            message = err.message;
          }
        } else if (typeof err === "string") {
          message = err;
        } else {
          try {
            message = JSON.stringify(err);
          } catch {
            message = String(err);
          }
        }
      } catch (e) {
        message = String(err);
      }
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (profileComplete === false) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6"
        >
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto">
            <UserIcon className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
            <p className="text-muted-foreground text-sm">
              To host events on Repdox, you must have a 100% complete profile. 
              This helps build trust in our community.
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missing Fields:</p>
            <ul className="text-sm space-y-1">
              {missingFields.map(field => (
                <li key={field} className="flex items-center gap-2 text-foreground/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {field}
                </li>
              ))}
            </ul>
          </div>
          <Button 
            onClick={() => navigate("/profile")}
            className="w-full bg-purple-600 hover:bg-purple-700 h-12 rounded-xl"
          >
            Go to Profile
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-purple-500/30">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/my-events")}
              className="p-2 -ml-2 rounded-full hover:bg-accent/10 transition-colors"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              {isEditMode ? "Edit Event" : "Create New Event"}
              {draftSaveState === "saving" && (
                <span className="text-xs font-normal text-muted-foreground animate-pulse">
                  Saving...
                </span>
              )}
              {draftSaveState === "saved" && (
                <span className="text-xs font-normal text-muted-foreground flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Saved
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Preview Toggle */}
            <button
              onClick={() =>
                setMobilePane((m) => (m === "fields" ? "preview" : "fields"))
              }
              className="lg:hidden p-2 rounded-full hover:bg-accent/10 transition-colors"
            >
              {mobilePane === "fields" ? (
                <Eye className="w-5 h-5" />
              ) : (
                <List className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 border-l border-border pl-4 ml-4">
            <span className="text-sm font-medium text-muted-foreground">
              View:
            </span>
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewMode("split")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === "split" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode("full")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === "full" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Full Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full p-4 lg:p-6 gap-8 relative">
        {/* RIGHT COLUMN: Live Preview - Moved to appear first in DOM for proper flex order */}
        <div
          className={`
           shrink-0 transition-all duration-300 ease-in-out order-2 lg:order-2
           ${viewMode === "full" ? "w-full" : "w-full lg:w-[480px]"}
           ${mobilePane === "preview" ? "block" : "hidden lg:block"}
           ${viewMode === "full" && mobilePane === "fields" ? "hidden lg:block" : ""} 
        `}
        >
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-muted px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground uppercase tracking-widest text-center">
              {viewMode === "full"
                ? "Full Event Preview"
                : "Event Card Preview"}
            </div>

            {/* Conditional Preview - Card or Full */}
            {viewMode === "split" ? (
              // Event Card Preview (compact)
              <EventCardPreview
                title={draft.title}
                description={draft.description}
                date={draft.date}
                location={draft.location}
                cover={draft.cover}
                tags={draft.tags}
                type={draft.type}
                format={draft.format}
              />
            ) : (
              // Full Event Details Preview - Expanded version
              <div className="w-full bg-background min-h-screen">
                <LivePreview draft={draft} />
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {viewMode === "split"
                ? "This card preview updates in real-time as you type"
                : 'Toggle to "Split" to see the compact card view'}
            </p>

            {/* Action Button below Preview */}
            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full rounded-2xl h-14 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg shadow-xl shadow-purple-500/20 group transition-all duration-300"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isEditMode ? "Update Event" : "Publish Event"}
                    <Rocket className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground mt-3 px-4">
                By publishing, you agree to our Terms of Service and Event
                Guidelines.
              </p>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Input Fields */}
        <div
          className={`flex-1 min-w-0 space-y-8 pb-32 lg:pb-0 order-1 lg:order-1 ${mobilePane === "preview" ? "hidden lg:block" : "block"} ${viewMode === "full" ? "hidden lg:hidden" : ""}`}
        >
          {/* Banner for Saved Draft */}
          {savedDraftAvailable && (
            <div className="rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                  <Save className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Unsaved draft found
                  </h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    We found a draft from a previous session.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={dismissSavedDraft}>
                  Dismiss
                </Button>
                <Button size="sm" variant="secondary" onClick={restoreDraft}>
                  Restore
                </Button>
              </div>
            </div>
          )}

          {/* SECTION: Basic Info */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b border-border">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wider">
                Basic Details
              </span>
            </div>

            <div className="grid gap-6">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Event Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => onChange("title", e.target.value)}
                  placeholder="e.g. Annual Tech Summit 2024"
                  className="h-12 text-lg bg-card/50 backdrop-blur-sm border-border/50 focus:bg-card transition-all"
                />
                {errors.title && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.title}
                  </p>
                )}
              </div>

              {/* Event Type */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Type (Select one)</Label>
                  <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-card/30 border border-border/50">
                    {["Hackathon", "Workshop"].map((t) => {
                      const isSelected = Array.isArray(form.type)
                        ? form.type.includes(t)
                        : form.type === t;
                      return (
                        <Badge
                          key={t}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${isSelected ? "bg-purple-600 hover:bg-purple-700" : "hover:border-purple-400"}`}
                          onClick={() => {
                            onChange("type", [t]);
                          }}
                        >
                          {t}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Format (Select one)</Label>
                  <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-card/30 border border-border/50">
                    {["Online", "Offline", "Hybrid"].map((f) => {
                      const isSelected = Array.isArray(form.format)
                        ? form.format.includes(f)
                        : form.format === f;
                      return (
                        <Badge
                          key={f}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${isSelected ? "bg-purple-600 hover:bg-purple-700" : "hover:border-purple-400"}`}
                          onClick={() => {
                            onChange("format", [f]);
                          }}
                        >
                          {f}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground text-sm">
                    /events/
                  </span>
                  <Input
                    value={form.slug}
                    onChange={(e) => onChange("slug", e.target.value)}
                    placeholder="my-event-slug"
                    className="pl-16 bg-card/50"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location / Platform</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={form.location}
                    onChange={(e) => onChange("location", e.target.value)}
                    className="pl-10 bg-card/50"
                    placeholder="e.g. San Francisco Convention Center or Zoom Link"
                  />
                </div>
                {errors.location && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.location}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* SECTION: Date & Time */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b border-border">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wider">
                Schedule
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Start */}
              <div className="space-y-3 p-4 rounded-xl bg-card/30 border border-border/50">
                <Label className="font-semibold text-purple-600 dark:text-purple-400">
                  Starts
                </Label>
                <div className="space-y-3">
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => onChange("start_date", e.target.value)}
                      className="pl-10 bg-transparent"
                      min={todayStr}
                    />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => onChange("start_time", e.target.value)}
                      className="pl-10 bg-transparent"
                    />
                  </div>
                </div>
                {errors.start && (
                  <p className="text-xs text-red-500">{errors.start}</p>
                )}
              </div>

              {/* End */}
              <div className="space-y-3 p-4 rounded-xl bg-card/30 border border-border/50">
                <Label className="font-semibold text-muted-foreground">
                  Ends
                </Label>
                <div className="space-y-3">
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => onChange("end_date", e.target.value)}
                      className="pl-10 bg-transparent"
                      min={form.start_date}
                    />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => onChange("end_time", e.target.value)}
                      className="pl-10 bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Dates */}
            <div className="pt-4 border-t border-border/50">
              <Label className="mb-3 block font-semibold text-muted-foreground">
                Registration Period
              </Label>
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Reg Start */}
                <div className="space-y-3 p-4 rounded-xl bg-card/30 border border-border/50">
                  <Label className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    Opens
                  </Label>
                  <div className="space-y-3">
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={form.registration_start_date}
                        onChange={(e) =>
                          onChange("registration_start_date", e.target.value)
                        }
                        className="pl-10 bg-transparent"
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={form.registration_start_time}
                        onChange={(e) =>
                          onChange("registration_start_time", e.target.value)
                        }
                        className="pl-10 bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Reg End */}
                <div className="space-y-3 p-4 rounded-xl bg-card/30 border border-border/50">
                  <Label className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    Closes
                  </Label>
                  <div className="space-y-3">
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={form.registration_deadline_date}
                        onChange={(e) =>
                          onChange("registration_deadline_date", e.target.value)
                        }
                        className="pl-10 bg-transparent"
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={form.registration_deadline_time}
                        onChange={(e) =>
                          onChange("registration_deadline_time", e.target.value)
                        }
                        className="pl-10 bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: Media */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b border-border">
              <ImageIcon className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wider">
                Media
              </span>
            </div>

            <div className="space-y-4">
              <Label>Uploaded Files</Label>
              <FileUpload
                onFilesChange={(files: any[]) => {
                  if (files && files.length > 0) {
                    const latest = files[files.length - 1];
                    if (latest.preview) {
                      setCoverUrl(latest.preview);
                    }
                  } else {
                    setCoverUrl(null);
                  }

                  setUploadedFiles(
                    files.map((f) => ({
                      file: f.file,
                      name: f.file.name,
                    })),
                  );
                }}
              />

              <p className="text-xs text-muted-foreground">
                Recommended: 16:9 aspect ratio for cover images.
              </p>
              {/* File List */}
              {uploadedFiles.length > 0 && (
                <ul className="space-y-2">
                  {uploadedFiles.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        onClick={() =>
                          setUploadedFiles((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* SECTION: Description */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b border-border">
              <List className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wider">
                Details
              </span>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Short Blurb</Label>
                <Input
                  value={form.short_blurb}
                  onChange={(e) => onChange("short_blurb", e.target.value)}
                  placeholder="A catchy one-liner..."
                  className="bg-card/50"
                  maxLength={150}
                />
                <p className="text-xs text-right text-muted-foreground">
                  {form.short_blurb.length}/150
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Long Description</Label>
                  <span className="text-xs text-muted-foreground bg-accent/10 px-2 py-0.5 rounded">
                    Markdown Supported
                  </span>
                </div>
                <Textarea
                  value={form.long_description}
                  onChange={(e) => onChange("long_description", e.target.value)}
                  className="min-h-[200px] font-mono text-sm bg-card/50"
                  placeholder="Describe your event in detail..."
                />
              </div>
            </div>
          </section>

          {/* Extended Sections (Agenda, FAQs, etc) */}
          <EventBuilderExtensions
            eventType={form.type}
            scheduleText={scheduleText}
            setScheduleText={setScheduleText}
            teamsText={teamsText}
            setTeamsText={setTeamsText}
            committeesText={committeesText}
            setCommitteesText={setCommitteesText}
            prizeText={prizeText}
            setPrizeText={setPrizeText}
            faqs={faqs}
            setFaqs={(v) => setFaqs(v.map((f, i) => ({ id: faqs[i]?.id ?? Date.now().toString() + i, ...f })))}
            speakers={speakers}
            setSpeakers={setSpeakers}
            resources={resources}
            setResources={setResources}
            rolesText={rolesText}
            setRolesText={setRolesText}
          />

          {/* Tags */}
          <section className="space-y-4 pt-4 border-t border-border">
            <Label>Tags</Label>
            <div className="bg-card/50 p-4 rounded-lg border border-border/50 space-y-3">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-3 py-1 text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="relative">
                <Input
                  value={tagInput}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Type a tag and press Enter..."
                  className="bg-transparent"
                />
                {showTagSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((tag) => (
                      <div
                        key={tag}
                        className="px-4 py-2 hover:bg-accent cursor-pointer text-sm"
                        onClick={() => addTag(tag)}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
