import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ADMIN_EMAILS } from "@/lib/adminService";
import { resolveService } from "@/core/services/di";
import type { IEventService } from "@/domains/events/interfaces/IEventService";
import {
  getMatchCentreData,
  isGamingEvent,
  updateTournamentMatch,
  updateMatchMap,
  upsertPlayerMatchStats,
  updateTournamentStatus,
  type MatchCentreData,
} from "@/lib/tournamentService";
import {
  ArrowLeft,
  CalendarClock,
  Clapperboard,
  Crown,
  Radio,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
  Video,
} from "lucide-react";

function buildEmbedUrl(
  platform?: string | null,
  streamUrl?: string | null,
  embedUrl?: string | null,
) {
  if (embedUrl) return embedUrl;
  if (!streamUrl) return null;
  const url = streamUrl.trim();
  if (!url) return null;
  if (platform?.toLowerCase() === "youtube") {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{11})/,
    );
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (platform?.toLowerCase() === "twitch") {
    const match = url.match(/twitch\.tv\/([^/?]+)/);
    if (match)
      return `https://player.twitch.tv/?channel=${match[1]}&parent=${window.location.hostname}`;
  }
  return url;
}

export default function MatchCentre() {
  const { slug, matchId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null,
  );
  const [stage, setStage] = useState("");
  const [matchFormat, setMatchFormat] = useState("BO3");
  const [statusDraft, setStatusDraft] = useState("upcoming");
  const [streamPlatform, setStreamPlatform] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [vodLink, setVodLink] = useState("");
  const [timeline, setTimeline] = useState("");
  const [mapName, setMapName] = useState("");
  const [mapScoreA, setMapScoreA] = useState("");
  const [mapScoreB, setMapScoreB] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liveMatchData, setLiveMatchData] = useState<MatchCentreData | null>(
    null,
  );
  const [realtimeStatus, setRealtimeStatus] = useState<
    "connecting" | "connected" | "disconnected" | "unknown"
  >("unknown");
  const hasRealtimeSubscribed = useRef(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Event slug is required");
      const eventData = await eventServiceCore().getEventBySlug(slug);
      if (!eventData) throw new Error("Event not found");
      return eventData;
    },
    retry: false,
  });

  const {
    data: matchData,
    isLoading: matchLoading,
    refetch,
  } = useQuery({
    queryKey: ["match-centre", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      return getMatchCentreData(matchId);
    },
    enabled: !!matchId,
    retry: false,
  });

  useEffect(() => {
    if (realtimeStatus === "connected" && matchData) {
      setLiveMatchData(matchData);
    }
  }, [matchData, realtimeStatus]);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (event && !isGamingEvent(event)) {
      navigate(`/events/${event.slug}`, { replace: true });
    }
  }, [event, navigate]);

  useEffect(() => {
    if (matchData) {
      setStage(matchData.match.stage_label || "");
      setMatchFormat(matchData.match.match_format || "BO3");
      setStatusDraft(matchData.match.match_status || "upcoming");
      setStreamPlatform(matchData.match.stream_platform || "");
      setStreamUrl(matchData.match.stream_url || "");
      setEmbedUrl(matchData.match.embed_url || "");
      setVodLink(matchData.match.vod_link || "");
      setTimeline(matchData.match.timeline || "");
    }
  }, [matchData]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase.channel(`match-centre-${matchId}`);
    setRealtimeStatus("connecting");

    const applyChange = (payload: any) => {
      if (!payload?.table) return;
      setLiveMatchData((current) => {
        if (!current) return current;
        const eventType = payload.eventType || payload.event;
        const rawRow = payload.new || payload.record || null;
        const rawOld = payload.old || payload.old_record || null;

        if (payload.table === "esports_tournament_matches") {
          if (!rawRow || rawRow.id !== current.match.id) return current;

          const nextMatch = {
            ...current.match,
            ...rawRow,
            team_a_score:
              rawRow.team_a_score === null || rawRow.team_a_score === undefined
                ? null
                : Number(rawRow.team_a_score),
            team_b_score:
              rawRow.team_b_score === null || rawRow.team_b_score === undefined
                ? null
                : Number(rawRow.team_b_score),
          };

          if (
            rawRow.team_a_id !== current.match.team_a_id ||
            rawRow.team_b_id !== current.match.team_b_id
          ) {
            refetch();
            return current;
          }

          return {
            ...current,
            match: nextMatch,
          };
        }

        if (payload.table === "esports_tournament_maps") {
          const row = rawRow;
          if (!row || row.match_id !== current.match.id) return current;

          const mapIndex = current.maps.findIndex((map) => map.id === row.id);
          const normalizedMap = {
            ...(current.maps[mapIndex] ?? {
              id: row.id,
              match_id: row.match_id,
            }),
            ...row,
            team_a_score:
              row.team_a_score === null || row.team_a_score === undefined
                ? null
                : Number(row.team_a_score),
            team_b_score:
              row.team_b_score === null || row.team_b_score === undefined
                ? null
                : Number(row.team_b_score),
            map_order:
              row.map_order === null || row.map_order === undefined
                ? null
                : Number(row.map_order),
          };

          const maps = [...current.maps];
          if (eventType === "DELETE" || eventType === "delete") {
            return {
              ...current,
              maps: maps.filter((map) => map.id !== row.id),
            };
          }

          if (mapIndex >= 0) {
            maps[mapIndex] = normalizedMap;
          } else {
            maps.push(normalizedMap);
          }
          return {
            ...current,
            maps,
          };
        }

        return current;
      });
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "esports_tournament_matches",
          filter: `id=eq.${matchId}`,
        },
        applyChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "esports_tournament_maps",
          filter: `match_id=eq.${matchId}`,
        },
        applyChange,
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          refetch();
          setLiveMatchData(null);
          return;
        }
        if (
          status === "TIMED_OUT" ||
          status === "CHANNEL_ERROR" ||
          status === "CLOSED"
        ) {
          setRealtimeStatus("disconnected");
        }
        if (status === "ERROR") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      setRealtimeStatus("disconnected");
      void supabase.removeChannel(channel);
    };
  }, [matchId, refetch]);

  const isRealtimeConnected = realtimeStatus === "connected";
  const currentMatchData = liveMatchData || matchData;

  const isOwner = Boolean(user && event?.created_by === user.id);
  const isAdminUser = Boolean(
    user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()),
  );
  const canManage = isOwner || isAdminUser;
  const match = currentMatchData?.match;
  const teamA = currentMatchData?.teamA;
  const teamB = currentMatchData?.teamB;
  const embedSrc = buildEmbedUrl(streamPlatform, streamUrl, embedUrl);
  const streamLinks = useMemo(() => {
    const links: Array<{ label: string; href: string }> = [];
    const addLink = (href: string, label: string) => {
      if (href?.trim()) {
        links.push({ label, href: href.trim() });
      }
    };

    const platform = match?.stream_platform?.toLowerCase() || "";
    const url = match?.stream_url?.trim() || "";

    if (platform === "youtube" || /youtube/i.test(url)) {
      addLink(url || "https://www.youtube.com", "YouTube");
    }
    if (platform === "twitch" || /twitch/i.test(url)) {
      addLink(url || "https://www.twitch.tv", "Twitch");
    }
    if (!platform && url) {
      addLink(url, "Stream");
    }

    return links;
  }, [match?.stream_platform, match?.stream_url]);
  const statsRows = useMemo(() => {
    const rows = [...(currentMatchData?.stats || [])].sort(
      (a, b) => (Number(b.acs) || 0) - (Number(a.acs) || 0),
    );
    return rows;
  }, [currentMatchData?.stats]);

  const handleSaveMatch = async (event: FormEvent) => {
    event.preventDefault();
    if (!match?.id) return;
    setSubmitting(true);
    try {
      await updateTournamentMatch(match.id, {
        match_status: statusDraft as any,
        stage_label: stage || null,
        match_format: matchFormat || null,
        stream_platform: streamPlatform || null,
        stream_url: streamUrl || null,
        embed_url: embedUrl || null,
        vod_link: vodLink || null,
        timeline: timeline || null,
      });
      toast({
        title: "Match updated",
        description: "Match centre details saved.",
      });
      await refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update match.";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMap = async () => {
    if (!currentMatchData?.maps?.[0]?.id) return;
    setSubmitting(true);
    try {
      await updateMatchMap(currentMatchData.maps[0].id, {
        map_name: mapName || currentMatchData.maps[0].map_name || "Ascent",
        team_a_score: Number(mapScoreA || 0),
        team_b_score: Number(mapScoreB || 0),
        map_status: "completed",
      });
      toast({
        title: "Map updated",
        description: "Map scores and state saved.",
      });
      await refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update map.";
      toast({
        title: "Map update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (eventLoading || matchLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Loading match centre...
      </div>
    );
  }

  if (!event || !isGamingEvent(event) || !match) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link to={`/events/${event.slug}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-accent/10 hover:bg-accent/20"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Match Centre
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {currentMatchData?.tournament?.game_name || "Esports Match"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentMatchData?.tournament?.tournament_type ||
                  "Single Elimination"}{" "}
                • {event.title}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-accent/30 text-accent">
                {match.match_status?.toUpperCase() || "UPCOMING"}
              </Badge>
              <Badge
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  realtimeStatus === "connected"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : realtimeStatus === "connecting"
                      ? "bg-sky-500/10 text-sky-600"
                      : realtimeStatus === "disconnected"
                        ? "bg-red-500/10 text-red-600"
                        : "bg-muted/10 text-muted-foreground"
                }`}
              >
                {realtimeStatus === "connected"
                  ? "Realtime connected"
                  : realtimeStatus === "connecting"
                    ? "Realtime connecting"
                    : realtimeStatus === "disconnected"
                      ? "Realtime disconnected"
                      : "Realtime unknown"}
              </Badge>
              {match.streamed_match ? (
                <Badge className="bg-accent/10 text-accent">
                  Featured broadcast
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-accent/10 p-6 shadow-2xl"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
                {currentMatchData?.tournament?.title || "Tournament"}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {match.stage_label || "Upper Final"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="rounded-full border border-border/60 px-3 py-1">
                  {match.match_format || "BO3"}
                </span>
                <span className="rounded-full border border-border/60 px-3 py-1">
                  {match.scheduled_time
                    ? new Date(match.scheduled_time).toLocaleString()
                    : "TBD"}
                </span>
              </div>
              {streamLinks.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {streamLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent"
                    >
                      <Video className="h-4 w-4" />
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-center min-w-[110px]">
                <div className="text-xs uppercase text-muted-foreground">
                  Status
                </div>
                <div className="font-bold">
                  {match.match_status?.toUpperCase() || "UPCOMING"}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-center min-w-[110px]">
                <div className="text-xs uppercase text-muted-foreground">
                  Format
                </div>
                <div className="font-bold">{match.match_format || "BO3"}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div
              className={`rounded-2xl border p-4 ${match.winner_id === teamA?.id ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/60 bg-background/70"}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-sm font-black">
                  {teamA?.team_name?.slice(0, 2).toUpperCase() || "TA"}
                </div>
                <div>
                  <div className="font-semibold">
                    {teamA?.team_name || "Team A"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Seed {teamA?.team_seed ?? "—"} •{" "}
                    {teamA?.region || "Region TBD"}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-3xl font-black">
                {match.team_a_score ?? 0}
              </div>
            </div>
            <div className="text-center rounded-2xl border border-border/60 bg-background/70 px-6 py-4">
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Live
              </div>
              <div className="text-4xl font-black">VS</div>
              <div className="text-sm text-muted-foreground">
                {match.match_status?.toUpperCase() || "UPCOMING"}
              </div>
            </div>
            <div
              className={`rounded-2xl border p-4 ${match.winner_id === teamB?.id ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/60 bg-background/70"}`}
            >
              <div className="flex items-center gap-3 justify-end">
                <div className="text-right">
                  <div className="font-semibold">
                    {teamB?.team_name || "Team B"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Seed {teamB?.team_seed ?? "—"} •{" "}
                    {teamB?.region || "Region TBD"}
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-sm font-black">
                  {teamB?.team_name?.slice(0, 2).toUpperCase() || "TB"}
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-right">
                {match.team_b_score ?? 0}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-accent" /> Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {match.match_status === "live" && embedSrc ? (
                <div className="overflow-hidden rounded-2xl border border-border/60">
                  <iframe
                    src={embedSrc}
                    title="Match stream"
                    className="aspect-video w-full"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 text-center p-6 text-muted-foreground">
                  Stream will appear when the match goes live.
                </div>
              )}
              {(match.stream_platform && match.stream_url) ||
              match.creator_name ? (
                <div className="rounded-2xl border border-border/60 p-4">
                  <div className="font-semibold">Available Streams</div>
                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {match.stream_platform && match.stream_url ? (
                      <div className="rounded-xl border border-border/60 p-2">
                        Official: {match.stream_platform} •{" "}
                        <a
                          className="text-accent"
                          href={match.stream_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Watch
                        </a>
                      </div>
                    ) : null}
                    {match.creator_name ? (
                      <div className="rounded-xl border border-border/60 p-2">
                        Creator Co-stream: {match.creator_name} •{" "}
                        <a
                          className="text-accent"
                          href={match.stream_link || "#"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Watch
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-accent" /> Match Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/60 p-3">
                <div className="font-semibold text-foreground">Tournament</div>
                <div>
                  {currentMatchData?.tournament?.game_name || "Valorant"}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <div className="font-semibold text-foreground">Stage</div>
                <div>{match.stage_label || "Upper Final"}</div>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <div className="font-semibold text-foreground">Scheduled</div>
                <div>
                  {match.scheduled_time
                    ? new Date(match.scheduled_time).toLocaleString()
                    : "To be announced"}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <div className="font-semibold text-foreground">VOD</div>
                {match.vod_link ? (
                  <a
                    className="text-accent"
                    href={match.vod_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch VOD
                  </a>
                ) : (
                  <div>VOD pending</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" /> Team Rosters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="font-semibold">
                  {teamA?.team_name || "Team A"}
                </div>
                <div className="mt-3 space-y-2">
                  {(currentMatchData?.playersA || []).map((player) => (
                    <div
                      key={player.id}
                      className="rounded-xl border border-border/60 p-2 text-sm"
                    >
                      <div className="font-medium">{player.player_name}</div>
                      <div className="text-muted-foreground">
                        {player.role || "Flex"} • {player.riot_id || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 p-4">
                <div className="font-semibold">
                  {teamB?.team_name || "Team B"}
                </div>
                <div className="mt-3 space-y-2">
                  {(currentMatchData?.playersB || []).map((player) => (
                    <div
                      key={player.id}
                      className="rounded-xl border border-border/60 p-2 text-sm"
                    >
                      <div className="font-medium">{player.player_name}</div>
                      <div className="text-muted-foreground">
                        {player.role || "Flex"} • {player.riot_id || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clapperboard className="h-5 w-5 text-accent" /> Map Veto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/60 p-3">
                {match.veto_details ||
                  "Map veto will be updated before the match begins."}
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                {match.map_veto ||
                  "Team A ban / Team B ban / Team A pick / Team B pick / Decider"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-accent" /> Maps & Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(currentMatchData?.maps || []).map((map) => (
              <div
                key={map.id}
                className="rounded-2xl border border-border/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{map.map_name || "Map"}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {map.map_status || "Upcoming"}
                    </div>
                  </div>
                  <Badge variant="outline">{map.map_order || 1}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 p-3">
                    <div className="text-muted-foreground">
                      {teamA?.team_name || "Team A"}
                    </div>
                    <div className="text-2xl font-black">
                      {map.team_a_score ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 p-3">
                    <div className="text-muted-foreground">
                      {teamB?.team_name || "Team B"}
                    </div>
                    <div className="text-2xl font-black">
                      {map.team_b_score ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" /> Live Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-2 pr-4">Player</th>
                    <th className="py-2 pr-4">Agent</th>
                    <th className="py-2 pr-4">ACS</th>
                    <th className="py-2 pr-4">K</th>
                    <th className="py-2 pr-4">D</th>
                    <th className="py-2 pr-4">A</th>
                    <th className="py-2 pr-4">+/−</th>
                    <th className="py-2 pr-4">ADR</th>
                    <th className="py-2 pr-4">HS%</th>
                  </tr>
                </thead>
                <tbody>
                  {statsRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/40">
                      <td className="py-3 pr-4 font-medium">
                        {row.player_name}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.role || "Flex"}
                      </td>
                      <td className="py-3 pr-4">{row.acs ?? 0}</td>
                      <td className="py-3 pr-4">{row.kills ?? 0}</td>
                      <td className="py-3 pr-4">{row.deaths ?? 0}</td>
                      <td className="py-3 pr-4">{row.assists ?? 0}</td>
                      <td className="py-3 pr-4">
                        {(
                          Number(row.kills || 0) - Number(row.deaths || 0)
                        ).toString()}
                      </td>
                      <td className="py-3 pr-4">{row.adr ?? 0}</td>
                      <td className="py-3 pr-4">{row.hs_percentage ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-accent" /> Match Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              {match.timeline ? (
                match.timeline
                  .split("\n")
                  .filter(Boolean)
                  .map((entry, index) => (
                    <div
                      key={`${entry}-${index}`}
                      className="rounded-xl border border-border/60 p-3"
                    >
                      {entry}
                    </div>
                  ))
              ) : (
                <div className="rounded-xl border border-border/60 p-3">
                  Timeline will be updated as the match progresses.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {canManage ? (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-accent" /> Admin Live
                Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveMatch} className="space-y-4">
                {match?.match_status === "live" ? (
                  <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm text-orange-700">
                    Live score editing is locked while the match is live. Use
                    the broadcast admin dashboard for live updates or wait until
                    the match is completed.
                  </div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stage">Stage</Label>
                    <Input
                      id="stage"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      placeholder="Upper Final"
                    />
                  </div>
                  <div>
                    <Label htmlFor="format">Format</Label>
                    <Input
                      id="format"
                      value={matchFormat}
                      onChange={(e) => setMatchFormat(e.target.value)}
                      placeholder="BO3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Input
                      id="status"
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      placeholder="live"
                    />
                  </div>
                  <div>
                    <Label htmlFor="streamPlatform">Stream Platform</Label>
                    <Input
                      id="streamPlatform"
                      value={streamPlatform}
                      onChange={(e) => setStreamPlatform(e.target.value)}
                      placeholder="YouTube"
                    />
                  </div>
                  <div>
                    <Label htmlFor="streamUrl">Stream URL</Label>
                    <Input
                      id="streamUrl"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <Label htmlFor="embedUrl">Embed URL</Label>
                    <Input
                      id="embedUrl"
                      value={embedUrl}
                      onChange={(e) => setEmbedUrl(e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vodLink">VOD Link</Label>
                    <Input
                      id="vodLink"
                      value={vodLink}
                      onChange={(e) => setVodLink(e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="timeline">Timeline</Label>
                  <Textarea
                    id="timeline"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    placeholder="7:00 PM\nMap veto completed"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={submitting || match?.match_status === "live"}
                  >
                    Save Match Details
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!match || match.match_status === "live"}
                    onClick={() =>
                      match?.id &&
                      updateTournamentMatch(match.id, {
                        match_status: "live" as any,
                      }).then(() => refetch())
                    }
                  >
                    Start Match
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!match || match.match_status === "live"}
                    onClick={() =>
                      match?.id &&
                      updateTournamentMatch(match.id, {
                        match_status: "completed" as any,
                      }).then(() => refetch())
                    }
                  >
                    End Match
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!match || match.match_status === "live"}
                    onClick={handleSaveMap}
                  >
                    Update Map
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
