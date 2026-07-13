import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  User,
  Code,
  Award,
  Rocket,
  Sparkles,
  Clock,
} from "lucide-react";
import { getRegistrationTableName } from "@/lib/utils";
import { isGamingEvent } from "@/lib/tournamentService";

export default function EventRegister() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("Event");
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);
  const [discordInvite, setDiscordInvite] = useState<string | null>(null);
  const [eventMeta, setEventMeta] = useState<{
    type?: string | string[] | null;
    category?: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    year: "",
    stream: "",
    teamSize: "Solo",
    teamName: "",
    isJoiningExisting: false,
    memberCount: "2",
    motivation: "",
    github: "",
    linkedin: "",
  });

  interface RegistrationDataRow {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    school?: string | null;
    year?: string | null;
    stream?: string | null;
    participation_mode?: string | null;
    expected_members?: number | null;
    motivation?: string | null;
    github?: string | null;
    linkedin?: string | null;
    edit_count: number;
    team_id?: string | null;
    event_teams?: { name: string } | null;
  }

  const [existingReg, setExistingReg] = useState<RegistrationDataRow | null>(
    null,
  );
  const [hasDraft, setHasDraft] = useState(false);
  const isGaming = Boolean(eventMeta && isGamingEvent(eventMeta as any));

  // Auto-save draft to local storage
  useEffect(() => {
    if (eventId) {
      const savedDraft = localStorage.getItem(`event_draft_${eventId}`);
      if (savedDraft) {
        setHasDraft(true);
      }
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId && !isSuccess && !isSubmitting) {
      localStorage.setItem(`event_draft_${eventId}`, JSON.stringify(formData));
    }
  }, [formData, isSuccess, isSubmitting, eventId]);

  const restoreDraft = () => {
    if (eventId) {
      const savedDraft = localStorage.getItem(`event_draft_${eventId}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData((prev) => ({ ...prev, ...parsed }));
          setHasDraft(false);
          toast({
            title: "Progress Restored",
            description:
              "We've loaded your information from your previous visit.",
          });
        } catch (err) {
          console.error("Failed to restore draft:", err);
        }
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        toast({
          title: "Authentication Required",
          description: `Please sign up to register for ${eventTitle}.`,
        });
        navigate(
          `/signup?redirect=${encodeURIComponent(window.location.pathname)}`,
        );
      }
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, eventTitle]);

  useEffect(() => {
    const fetchEventAndRegistration = async () => {
      if (!slug) return;

      // Fetch Event ID, Slug, Title, and Discord Invite
      const { data: eventData } = await supabase
        .from("events")
        .select("id, slug, title, discord_invite, type, category")
        .eq("slug", slug)
        .maybeSingle();

      let currentEventId = null;
      let currentEventSlug = null;

      if (eventData) {
        currentEventId = eventData.id;
        currentEventSlug = eventData.slug;
        setEventId(eventData.id);
        setEventTitle(eventData.title);
        setDiscordInvite(eventData.discord_invite);
        setEventMeta({ type: eventData.type, category: eventData.category });
      } else {
        const { data: latest } = await supabase
          .from("events")
          .select("id, slug, title, discord_invite, type, category")
          .limit(1)
          .single();
        if (latest) {
          currentEventId = latest.id;
          currentEventSlug = latest.slug;
          setEventId(latest.id);
          setEventTitle(latest.title);
          setDiscordInvite(latest.discord_invite);
          setEventMeta({ type: latest.type, category: latest.category });
        }
      }

      const dynamicTableName = currentEventId
        ? getRegistrationTableName({
            id: currentEventId,
            slug: currentEventSlug,
          })
        : null;
      if (dynamicTableName) setTableName(dynamicTableName);

      // If user is authenticated and event ID is known, check for existing registration
      if (userId && currentEventId && dynamicTableName) {
        let regData: any = null;

        try {
          const { data: rawRegData, error: regError } = await supabase
            .from(dynamicTableName as any)
            .select("*")
            .eq("event_id", currentEventId)
            .eq("user_id", userId)
            .maybeSingle();

          if (!regError) {
            regData = rawRegData;
          }
        } catch (e) {
          console.warn(
            "Could not query dynamic table, trying central event_registrations",
            e,
          );
        }

        // Fallback to central event_registrations table
        if (!regData && dynamicTableName !== "event_registrations") {
          try {
            const { data: fallbackRegData } = await supabase
              .from("event_registrations")
              .select("*")
              .eq("event_id", currentEventId)
              .eq("user_id", userId)
              .maybeSingle();
            if (fallbackRegData) {
              regData = fallbackRegData;
            }
          } catch (e) {
            console.error("Fallback query to event_registrations failed", e);
          }
        }

        if (regData) {
          // Parse any custom fields stored as JSON inside message
          let parsedMessage: any = {};
          if (regData.message) {
            try {
              parsedMessage = JSON.parse(regData.message);
            } catch (e) {
              console.warn("Failed to parse registration message JSON", e);
            }
          }

          let teamName = parsedMessage.teamName || "";
          const resolvedTeamId =
            regData.team_id || parsedMessage.team_id || null;
          if (resolvedTeamId && !teamName) {
            const { data: teamData } = await supabase
              .from("event_teams")
              .select("name")
              .eq("id", resolvedTeamId)
              .maybeSingle();
            if (teamData) teamName = teamData.name;
          }

          // Build a normalized registration data object
          const normalizedReg: RegistrationDataRow = {
            id: regData.id,
            name: regData.name || parsedMessage.name || null,
            email: regData.email || parsedMessage.email || null,
            phone: regData.phone || parsedMessage.phone || null,
            school: regData.school || parsedMessage.school || null,
            year: regData.year || parsedMessage.year || null,
            stream: regData.stream || parsedMessage.stream || null,
            participation_mode:
              regData.participation_mode ||
              parsedMessage.participation_mode ||
              null,
            expected_members:
              regData.expected_members !== undefined &&
              regData.expected_members !== null
                ? regData.expected_members
                : parsedMessage.expected_members !== undefined
                  ? Number(parsedMessage.expected_members)
                  : null,
            motivation: regData.motivation || parsedMessage.motivation || null,
            github: regData.github || parsedMessage.github || null,
            linkedin: regData.linkedin || parsedMessage.linkedin || null,
            edit_count:
              regData.edit_count !== undefined && regData.edit_count !== null
                ? regData.edit_count
                : parsedMessage.edit_count !== undefined
                  ? Number(parsedMessage.edit_count)
                  : 0,
            team_id: resolvedTeamId,
          };
          setExistingReg(normalizedReg);

          setFormData({
            name: normalizedReg.name || "",
            email: normalizedReg.email || "",
            phone: normalizedReg.phone || "",
            school: normalizedReg.school || "",
            year: normalizedReg.year || "",
            stream: normalizedReg.stream || "",
            teamSize: normalizedReg.participation_mode || "Solo",
            teamName: teamName,
            isJoiningExisting: !!resolvedTeamId,
            memberCount: normalizedReg.expected_members?.toString() || "2",
            motivation: normalizedReg.motivation || "",
            github: normalizedReg.github || "",
            linkedin: normalizedReg.linkedin || "",
          });
        }
      }
    };
    fetchEventAndRegistration();
  }, [userId, slug]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    const type = "type" in e.target ? (e.target as any).type : undefined;
    let val =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    if (name === "phone" && typeof val === "string") {
      val = val.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (existingReg && existingReg.edit_count >= 1) {
      toast({
        title: "Edit Limit Reached",
        description:
          "You have already used your one-time edit for this registration.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!eventId) throw new Error("Event ID not found. Please try again.");
      if (!tableName)
        throw new Error("Event table not loaded. Please refresh.");
      if (!userId) throw new Error("You must be logged in to register.");

      // 1. Handle Team Creation/Selection (Only if not already in a team or changing it)
      let teamId = existingReg?.team_id || null;
      let isNewTeamCreated = false;

      // Basic team logic: if mode changed or name changed, we handle it
      if (
        formData.teamSize === "Team" &&
        (!existingReg ||
          formData.teamName !== (existingReg.event_teams as any)?.name)
      ) {
        if (!formData.isJoiningExisting) {
          // Check if team name is already taken for this event
          const { data: nameCheck } = await supabase
            .from("event_teams")
            .select("id")
            .eq("event_id", eventId)
            .ilike("name", formData.teamName.trim())
            .maybeSingle();

          if (nameCheck) {
            throw new Error(
              `The team name "${formData.teamName}" is already taken. Please choose another or join the existing team.`,
            );
          }

          const { data: newTeam, error: teamError } = await supabase
            .from("event_teams")
            .insert([
              {
                event_id: eventId,
                name: formData.teamName.trim(),
                max_members: parseInt(formData.memberCount),
              },
            ])
            .select()
            .single();

          if (teamError)
            throw new Error("Could not create team: " + teamError.message);
          if (newTeam) {
            teamId = newTeam.id;
            isNewTeamCreated = true;
          }
        } else {
          const { data: existingTeam } = await supabase
            .from("event_teams")
            .select("id")
            .eq("event_id", eventId)
            .ilike("name", formData.teamName.trim())
            .maybeSingle();

          if (!existingTeam) {
            throw new Error(
              `Team "${formData.teamName}" not found. Please check the spelling or create a new team.`,
            );
          }
          teamId = existingTeam.id;
        }
      }

      const nextEditCount = existingReg ? (existingReg.edit_count || 0) + 1 : 0;

      const cleanName = formData.name.trim();
      const cleanEmail = formData.email.trim();
      const cleanPhone = formData.phone.replace(/[`'"]/g, "").trim();

      // 1. Full Payload (succeeds on solveforindia and central registrations tables)
      const fullRegistrationData = {
        event_id: eventId,
        team_id: teamId,
        user_id: userId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: "participant",
        school: formData.school,
        year: formData.year,
        stream: formData.stream,
        motivation: formData.motivation,
        github: formData.github,
        linkedin: formData.linkedin,
        participation_mode: formData.teamSize,
        expected_members:
          formData.teamSize === "Team" && !formData.isJoiningExisting
            ? parseInt(formData.memberCount)
            : null,
        message: formData.teamName
          ? JSON.stringify({ teamName: formData.teamName.trim() })
          : null,
        edit_count: nextEditCount,
      };

      // 2. Semi-Clean Payload (succeeds on dynamic tables with school, year, etc. but no role/team_id)
      const semiCleanRegistrationData = {
        event_id: eventId,
        user_id: userId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        school: formData.school,
        year: formData.year,
        stream: formData.stream,
        motivation: formData.motivation,
        github: formData.github,
        linkedin: formData.linkedin,
        participation_mode: formData.teamSize,
        expected_members:
          formData.teamSize === "Team" && !formData.isJoiningExisting
            ? parseInt(formData.memberCount)
            : null,
        message: JSON.stringify({
          teamName: formData.teamName.trim(),
          role: "role" in fullRegistrationData ? "participant" : undefined,
          team_id: teamId,
        }),
        edit_count: nextEditCount,
      };

      // 3. Minimal Payload (fallback for dynamic tables with no custom columns at all)
      const minimalRegistrationData = {
        event_id: eventId,
        user_id: userId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        message: JSON.stringify({
          school: formData.school,
          year: formData.year,
          stream: formData.stream,
          motivation: formData.motivation,
          github: formData.github,
          linkedin: formData.linkedin,
          participation_mode: formData.teamSize,
          expected_members:
            formData.teamSize === "Team" && !formData.isJoiningExisting
              ? parseInt(formData.memberCount)
              : null,
          edit_count: nextEditCount,
          teamName: formData.teamName.trim(),
          role: "participant",
          team_id: teamId,
        }),
      };

      let submitError = null;
      let successInDynamicTable = false;

      if (existingReg) {
        // --- UPDATE FLOW ---
        // 1. Try full update in dynamic table
        try {
          console.log(
            `[EventRegister] Attempting full update in dynamic table '${tableName}'...`,
          );
          const { error } = await supabase
            .from(tableName as any)
            .update(fullRegistrationData as any)
            .eq("id", existingReg.id);

          if (!error) {
            successInDynamicTable = true;
          } else {
            submitError = error;
            console.warn(
              `[EventRegister] Full update in dynamic table failed:`,
              error.message,
            );
          }
        } catch (e) {
          submitError = e;
          console.warn(
            `[EventRegister] Full update in dynamic table exception:`,
            e,
          );
        }

        // 2. Try semi-clean update in dynamic table (no role/team_id)
        if (!successInDynamicTable && tableName !== "event_registrations") {
          try {
            console.log(
              `[EventRegister] Retrying with semi-clean update in dynamic table '${tableName}'...`,
            );
            const { error } = await supabase
              .from(tableName as any)
              .update(semiCleanRegistrationData as any)
              .eq("id", existingReg.id);

            if (!error) {
              successInDynamicTable = true;
              submitError = null;
            } else {
              submitError = error;
              console.warn(
                `[EventRegister] Semi-clean update in dynamic table failed:`,
                error.message,
              );
            }
          } catch (e) {
            submitError = e;
            console.warn(`[EventRegister] Semi-clean update exception:`, e);
          }
        }

        // 3. Try minimal update in dynamic table (all in message)
        if (!successInDynamicTable && tableName !== "event_registrations") {
          try {
            console.log(
              `[EventRegister] Retrying with minimal update in dynamic table '${tableName}'...`,
            );
            const { error } = await supabase
              .from(tableName as any)
              .update(minimalRegistrationData as any)
              .eq("id", existingReg.id);

            if (!error) {
              successInDynamicTable = true;
              submitError = null;
            } else {
              submitError = error;
              console.warn(
                `[EventRegister] Minimal update in dynamic table failed:`,
                error.message,
              );
            }
          } catch (e) {
            submitError = e;
            console.warn(`[EventRegister] Minimal update exception:`, e);
          }
        }

        // 4. Fallback to central event_registrations
        if (!successInDynamicTable && tableName !== "event_registrations") {
          console.warn(
            "[EventRegister] Falling back to central event_registrations update",
          );
          try {
            const { error } = await supabase
              .from("event_registrations")
              .update(fullRegistrationData as any)
              .eq("id", existingReg.id);
            submitError = error;
          } catch (e) {
            submitError = e;
          }
        }
      } else {
        // --- INSERT FLOW ---
        // 1. Try full insert in dynamic table
        try {
          console.log(
            `[EventRegister] Attempting full insert in dynamic table '${tableName}'...`,
          );
          const { error } = await supabase
            .from(tableName as any)
            .insert([fullRegistrationData as any]);

          if (!error) {
            successInDynamicTable = true;
          } else {
            submitError = error;
            console.warn(
              `[EventRegister] Full insert in dynamic table failed:`,
              error.message,
            );
          }
        } catch (e) {
          submitError = e;
          console.warn(
            `[EventRegister] Full insert in dynamic table exception:`,
            e,
          );
        }

        // 2. Try semi-clean insert in dynamic table (no role/team_id)
        if (!successInDynamicTable && tableName !== "event_registrations") {
          try {
            console.log(
              `[EventRegister] Retrying with semi-clean insert in dynamic table '${tableName}'...`,
            );
            const { error } = await supabase
              .from(tableName as any)
              .insert([semiCleanRegistrationData as any]);

            if (!error) {
              successInDynamicTable = true;
              submitError = null;
            } else {
              submitError = error;
              console.warn(
                `[EventRegister] Semi-clean insert in dynamic table failed:`,
                error.message,
              );
            }
          } catch (e) {
            submitError = e;
            console.warn(`[EventRegister] Semi-clean insert exception:`, e);
          }
        }

        // 3. Try minimal insert in dynamic table (all in message)
        if (!successInDynamicTable && tableName !== "event_registrations") {
          try {
            console.log(
              `[EventRegister] Retrying with minimal insert in dynamic table '${tableName}'...`,
            );
            const { error } = await supabase
              .from(tableName as any)
              .insert([minimalRegistrationData as any]);

            if (!error) {
              successInDynamicTable = true;
              submitError = null;
            } else {
              submitError = error;
              console.warn(
                `[EventRegister] Minimal insert in dynamic table failed:`,
                error.message,
              );
            }
          } catch (e) {
            submitError = e;
            console.warn(`[EventRegister] Minimal insert exception:`, e);
          }
        }

        // 4. Fallback to central event_registrations
        if (!successInDynamicTable && tableName !== "event_registrations") {
          console.warn(
            "[EventRegister] Falling back to central event_registrations insert",
          );
          try {
            const { error } = await supabase
              .from("event_registrations")
              .insert([fullRegistrationData as any]);
            submitError = error;
          } catch (e) {
            submitError = e;
          }
        }
      }

      if (submitError) {
        if (isNewTeamCreated && teamId)
          await supabase.from("event_teams").delete().eq("id", teamId);
        const errMsg = (submitError as any)?.message || String(submitError);
        const errCode = (submitError as any)?.code;
        if (errCode === "23505" || errMsg.includes("unique")) {
          throw new Error("You have already registered for this event!");
        }
        throw new Error(errMsg);
      }

      setIsSuccess(true);
      toast({
        title: existingReg
          ? "Registration Updated!"
          : "Registration Successful!",
        description: "Complete the next steps on the screen to proceed.",
      });
      if (eventId) localStorage.removeItem(`event_draft_${eventId}`);
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl space-y-6"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Registration Complete!
            </h2>
            <p className="text-gray-400 text-sm">
              Welcome to {eventTitle}. Please complete the step below to unlock
              the portal.
            </p>
          </div>

          <div className="border border-purple-500/30 bg-purple-500/5 rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-purple-400 text-sm uppercase tracking-wider">
              Step 1: Join Community
            </h4>
            <p className="text-xs text-gray-400">
              Join our official Discord server to get event announcements, find
              teammates, and complete your setup.
            </p>
            <Button
              onClick={() => {
                window.open(
                  discordInvite || "https://discord.gg/dNjHbpQEBT",
                  "_blank",
                );
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              <span>Join Repdox Discord</span>
            </Button>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => (window.location.href = "https://repdox.com")}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-6 rounded-xl font-bold"
            >
              Continue to Repdox.com
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030308] text-white py-12 px-4 sm:px-8 relative overflow-x-hidden font-sans">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_10%,rgba(139,92,246,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
              {eventTitle}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl md:text-7xl font-bold mb-6"
          >
            {existingReg ? (
              <>
                Modify Your <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                  Registration
                </span>
              </>
            ) : (
              <>
                {isGaming ? "Join the" : "Join the"} <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                  {isGaming ? "Tournament" : "Event"}
                </span>
              </>
            )}
          </motion.h1>
          <motion.p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
            {existingReg
              ? "You can update your details once before the event starts. Please ensure all information is correct."
              : `Fill out the form below to secure your spot in ${eventTitle}${isGaming ? " and join the tournament" : ""}.`}
          </motion.p>

          <AnimatePresence>
            {hasDraft && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 max-w-md mx-auto"
              >
                <p className="text-sm text-purple-300 font-medium italic">
                  We found some information from your last visit!
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setHasDraft(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    Dismiss
                  </Button>
                  <Button
                    type="button"
                    onClick={restoreDraft}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 rounded-xl"
                  >
                    Restore Progress
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Section 1: Personal Details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12"
          >
            {!existingReg && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 mb-10"
              >
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-500 text-sm uppercase tracking-wider mb-1">
                    Registration Policy
                  </h4>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Please ensure all information is accurate. To maintain data
                    integrity, you will only be allowed to{" "}
                    <span className="text-amber-500/80 font-semibold italic">
                      edit your details once
                    </span>{" "}
                    after completing this registration.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                <User className="text-purple-400 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {isGaming ? "Gamer Details" : "Personal Details"}
                </h2>
                <p className="text-gray-500 text-sm">
                  {isGaming
                    ? "Tell us how you’ll show up for the tournament"
                    : "Tell us about yourself"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-gray-400">Full Name</Label>
                <Input
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-black/40 border-white/10 h-14 rounded-xl text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Email Address</Label>
                <Input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-black/40 border-white/10 h-14 rounded-xl text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">WhatsApp Number</Label>
                <Input
                  name="phone"
                  type="tel"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="10-digit number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="bg-black/40 border-white/10 h-14 rounded-xl text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">
                  {isGaming ? "In-Game Name (IGN)" : "School / University"}
                </Label>
                <Input
                  name="school"
                  required
                  placeholder={isGaming ? "e.g. ShadowFox" : ""}
                  value={formData.school}
                  onChange={handleInputChange}
                  className="bg-black/40 border-white/10 h-14 rounded-xl text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">
                  {isGaming ? "Discord Username" : "Stream / Major"}
                </Label>
                <Input
                  name="stream"
                  required
                  placeholder={
                    isGaming ? "e.g. shadowfox#1234" : "e.g. PCM, CSE"
                  }
                  value={formData.stream}
                  onChange={handleInputChange}
                  className="bg-black/40 border-white/10 h-14 rounded-xl text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">
                  {isGaming ? "Preferred Role" : "Current Year"}
                </Label>
                <select
                  name="year"
                  required
                  value={formData.year}
                  onChange={handleInputChange}
                  className="w-full bg-black/40 border border-white/10 h-14 rounded-xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="" disabled>
                    {isGaming ? "Select Role" : "Select Year"}
                  </option>
                  {isGaming ? (
                    <>
                      <option value="Entry Fragger">Entry Fragger</option>
                      <option value="Support">Support</option>
                      <option value="IGL">IGL</option>
                      <option value="Flex">Flex</option>
                      <option value="Coach/Analyst">Coach / Analyst</option>
                    </>
                  ) : (
                    <>
                      <optgroup label="School" className="bg-slate-900">
                        <option value="9">9th Grade</option>
                        <option value="10">10th Grade</option>
                        <option value="11">11th Grade</option>
                        <option value="12">12th Grade</option>
                      </optgroup>
                      <optgroup label="University" className="bg-slate-900">
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </optgroup>
                    </>
                  )}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Section 2: Team Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <Code className="text-blue-400 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Team Composition</h2>
                <p className="text-gray-500 text-sm">Solo or with a team?</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                {["Solo", "Team"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, teamSize: mode }))
                    }
                    className={`flex-1 py-4 rounded-xl border transition-all font-bold ${
                      formData.teamSize === mode
                        ? "bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                        : "bg-black/40 border-white/10 text-gray-500 hover:border-white/20"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {formData.teamSize === "Team" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      id="isJoining"
                      name="isJoiningExisting"
                      checked={formData.isJoiningExisting}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-white/20 bg-black/40 text-purple-600 focus:ring-purple-500/50"
                    />
                    <Label
                      htmlFor="isJoining"
                      className="text-gray-300 cursor-pointer"
                    >
                      Joining an existing team?
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-gray-400">
                        {formData.isJoiningExisting
                          ? "Exact Team Name"
                          : "New Team Name"}
                      </Label>
                      <Input
                        name="teamName"
                        required
                        value={formData.teamName}
                        onChange={handleInputChange}
                        placeholder={
                          formData.isJoiningExisting
                            ? "Enter the team name to join"
                            : "Enter a unique name for your team"
                        }
                        className="bg-black/40 border-white/10 h-14 rounded-xl text-white"
                      />
                    </div>

                    {!formData.isJoiningExisting && (
                      <div className="space-y-2">
                        <Label className="text-gray-400">
                          Initial Team Size (Max 4)
                        </Label>
                        <select
                          name="memberCount"
                          value={formData.memberCount}
                          onChange={handleInputChange}
                          className="w-full bg-black/40 border border-white/10 h-14 rounded-xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                          <option value="2">2 Members</option>
                          <option value="3">3 Members</option>
                          <option value="4">4 Members (Full Team)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Section 3: Final Details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
                <Award className="text-green-400 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {isGaming ? "Tournament Notes" : "Final Pulse"}
                </h2>
                <p className="text-gray-500 text-sm">
                  {isGaming
                    ? "Anything the organiser should know?"
                    : "The finish line"}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <Label className="text-gray-400">
                  {isGaming
                    ? "Tell us a bit about your squad or playstyle"
                    : "Why do you want to participate?"}
                </Label>
                <Textarea
                  name="motivation"
                  required={!isGaming}
                  value={formData.motivation}
                  onChange={handleInputChange}
                  placeholder={
                    isGaming
                      ? "Optional: share your squad goals, experience, or anything helpful for the organiser"
                      : ""
                  }
                  className="bg-black/40 border-white/10 rounded-2xl min-h-[140px] p-4 text-lg text-white"
                />
              </div>
              {!isGaming && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-gray-400">
                      GitHub Profile (Optional)
                    </Label>
                    <Input
                      name="github"
                      type="url"
                      value={formData.github}
                      onChange={handleInputChange}
                      className="bg-black/40 border-white/10 h-14 rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">
                      LinkedIn Profile (Optional)
                    </Label>
                    <Input
                      name="linkedin"
                      type="url"
                      value={formData.linkedin}
                      onChange={handleInputChange}
                      className="bg-black/40 border-white/10 h-14 rounded-xl text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Submit Action */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="pt-8"
          >
            <Button
              type="submit"
              disabled={
                isSubmitting || (existingReg && existingReg.edit_count >= 1)
              }
              className={`w-full py-8 rounded-[24px] font-bold text-xl shadow-[0_20px_40px_rgba(147,51,234,0.3)] transition-all ${
                existingReg && existingReg.edit_count >= 1
                  ? "bg-gray-800 text-gray-400 cursor-not-allowed border border-white/5"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : existingReg ? (
                existingReg.edit_count >= 1 ? (
                  <span className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500" /> Changes
                    Locked
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <Rocket className="w-6 h-6" /> Update Registration (Final
                    Edit)
                  </span>
                )
              ) : (
                <span className="flex items-center gap-3">
                  <Rocket className="w-6 h-6" /> Complete Registration
                </span>
              )}
            </Button>
          </motion.div>
        </form>

        <footer className="text-center mt-20 text-gray-600 text-sm">
          Having trouble?{" "}
          <Link to="/contact" className="text-purple-500 hover:underline">
            Contact Support
          </Link>
        </footer>
      </div>
    </div>
  );
}
