import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { registerDefaults } from "@/core/services/registerDefaults";
import { resolveService } from "@/core/services/di";
import type { IEventService } from "@/domains/events/interfaces/IEventService";
import {
  ensureTournamentForEvent,
  getLiveMatchOverlayData,
  isGamingEvent,
  listTournamentMatches,
  listTournamentTeams,
  createTournamentTeam,
  updateTournamentTeam,
  updateTournamentMatch,
  submitMatchResult,
  subscribeToTournamentUpdates,
  updateTournamentStatus,
  type TournamentMatchRecord,
  type TournamentRecord,
  type TournamentTeamRecord,
} from "@/lib/tournamentService";
import {
  ArrowLeft,
  CalendarClock,
  Crown,
  PlayCircle,
  Trophy,
  Users,
  Sparkles,
  Radio,
  ShieldAlert,
  ClipboardList,
} from "lucide-react";

export default function EventTournament() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null,
  );
  const [teamName, setTeamName] = useState("");
  const [teamPlayers, setTeamPlayers] = useState("");
  const [teamLogo, setTeamLogo] = useState("");
  const [riotIds, setRiotIds] = useState("");
  const [seedDrafts, setSeedDrafts] = useState<Record<string, string>>({});
  const [scoreDrafts, setScoreDrafts] = useState<
    Record<string, { teamA: string; teamB: string }>
  >({});
  const [matchTimeDrafts, setMatchTimeDrafts] = useState<
    Record<string, string>
  >({});
  const [bracketUrlDraft, setBracketUrlDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data: event,
    isLoading: eventLoading,
    refetch: refetchEvent,
  } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      if (!slug) return null;
      const found = await eventServiceCore().getEventBySlug(slug);
      if (!found) throw new Error("Event not found");
      return found;
    },
    enabled: !!slug,
    retry: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    loadUser();
  }, []);

  const isGaming = useMemo(() => isGamingEvent(event), [event]);
  const isOwner = Boolean(user && event?.created_by === user.id);
  const isAdminUser = Boolean(
    user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()),
  );
  const canManage = isOwner || isAdminUser;

  const {
    data: tournament,
    isLoading: tournamentLoading,
    refetch: refetchTournament,
  } = useQuery({
    queryKey: ["event_tournament", event?.id],
    queryFn: async () => {
      if (!event?.id) return null;
      return ensureTournamentForEvent(event.id, { game_name: "Valorant" });
    },
    enabled: !!event?.id,
    retry: false,
  });

  const { data: teams = [], refetch: refetchTeams } = useQuery({
    queryKey: ["tournament_teams", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      return listTournamentTeams(tournament.id);
    },
    enabled: !!tournament?.id,
  });

  const { data: matches = [], refetch: refetchMatches } = useQuery({
    queryKey: ["tournament_matches", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      return listTournamentMatches(tournament.id);
    },
    enabled: !!tournament?.id,
  });

  const { data: liveOverlay } = useQuery({
    queryKey: ["tournament_overlay", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return null;
      return getLiveMatchOverlayData(tournament.id);
    },
    enabled: !!tournament?.id,
  });

  useEffect(() => {
    if (!tournament?.id) return;
    const unsubscribe = subscribeToTournamentUpdates(tournament.id, () => {
      refetchTournament();
      refetchTeams();
      refetchMatches();
    });
    return () => unsubscribe();
  }, [tournament?.id, refetchTournament, refetchTeams, refetchMatches]);

  useEffect(() => {
    if (event && !isGaming) {
      navigate(`/events/${event.slug}`, { replace: true });
    }
  }, [event, isGaming, navigate]);

  useEffect(() => {
    const fallbackUrl =
      (
        event as
          | { bracket_url?: string | null; bracket_link?: string | null }
          | undefined
      )?.bracket_url ??
      (
        event as
          | { bracket_url?: string | null; bracket_link?: string | null }
          | undefined
      )?.bracket_link ??
      "";
    setBracketUrlDraft(fallbackUrl);
  }, [event]);

  const teamById = useMemo(() => {
    return Object.fromEntries((teams || []).map((team) => [team.id, team]));
  }, [teams]);

  const groupedMatches = useMemo(() => {
    const rounds = new Map<number, TournamentMatchRecord[]>();
    for (const match of matches || []) {
      const existing = rounds.get(match.round_number) || [];
      existing.push(match);
      rounds.set(
        match.round_number,
        existing.sort((a, b) => a.match_number - b.match_number),
      );
    }
    return Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const myTeam = useMemo(() => {
    return (teams || []).find((team) => team.captain_id === user?.id) || null;
  }, [teams, user?.id]);

  const myMatches = useMemo(() => {
    if (!myTeam) return [];
    return (matches || []).filter(
      (match) => match.team_a_id === myTeam.id || match.team_b_id === myTeam.id,
    );
  }, [matches, myTeam]);

  const handleRegisterTeam = async (event: FormEvent) => {
    event.preventDefault();
    if (!tournament?.id || !user?.id) {
      toast({
        title: "Authentication required",
        description: "Sign in to register a team.",
      });
      return;
    }
    if (!teamName.trim()) {
      toast({
        title: "Team name required",
        description: "Please choose a team name.",
      });
      return;
    }

    const duplicate = (teams || []).some(
      (team) =>
        team.team_name.toLowerCase() === teamName.trim().toLowerCase() ||
        team.captain_id === user.id,
    );
    if (duplicate) {
      toast({
        title: "Duplicate registration",
        description: "You already registered this team for the tournament.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createTournamentTeam({
        tournamentId: tournament.id,
        teamName: teamName.trim(),
        captainId: user.id,
        teamLogo: teamLogo.trim() || null,
        player1: teamPlayers.trim() || null,
        riotIds: riotIds.trim() || null,
        checkedIn: true,
      });
      toast({
        title: "Team registered",
        description: "Your team is now in the tournament pool.",
      });
      setTeamName("");
      setTeamPlayers("");
      setTeamLogo("");
      setRiotIds("");
      await refetchTeams();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to register team.";
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedChange = async (teamId: string) => {
    const seed = seedDrafts[teamId];
    if (seed === undefined) return;
    try {
      await updateTournamentTeam(teamId, { team_seed: Number(seed) });
      toast({
        title: "Seed updated",
        description: "The team seed has been adjusted.",
      });
      await refetchTeams();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update seed.";
      toast({
        title: "Seed update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSetMatchTime = async (matchId: string) => {
    try {
      const value = matchTimeDrafts[matchId];
      await updateTournamentMatch(matchId, {
        scheduled_time: value ? new Date(value).toISOString() : null,
      });
      toast({
        title: "Match time updated",
        description: "The match schedule has been updated.",
      });
      await refetchMatches();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update schedule.";
      toast({
        title: "Schedule update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSubmitResult = async (matchId: string) => {
    const values = scoreDrafts[matchId];
    if (!values) return;
    const teamAScore = Number(values.teamA);
    const teamBScore = Number(values.teamB);
    if (
      [teamAScore, teamBScore].some((value) => Number.isNaN(value) || value < 0)
    ) {
      toast({
        title: "Invalid result",
        description: "Scores must be non-negative numbers.",
      });
      return;
    }
    try {
      await submitMatchResult(matchId, { teamAScore, teamBScore });
      toast({
        title: "Result submitted",
        description: "The bracket has been updated.",
      });
      await refetchMatches();
      await refetchTournament();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit the score.";
      toast({
        title: "Result submission failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSaveBracket = async () => {
    if (!event?.id) return;
    setSubmitting(true);
    try {
      // Prefer core EventService update; fall back to legacy supabase update
      try {
        await eventServiceCore().updateEvent(event.id, {
          bracket_url: bracketUrlDraft.trim() || null,
        } as any);
      } catch (e) {
        const { error } = await supabase
          .from("events")
          .update({ bracket_url: bracketUrlDraft.trim() || null } as Record<
            string,
            unknown
          >)
          .eq("id", event.id);
        if (error) throw error;
      }

      toast({
        title: "Bracket saved",
        description: "The bracket link is now available to viewers.",
      });
      await refetchEvent();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save the bracket.";
      toast({
        title: "Bracket save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (eventLoading || tournamentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Loading tournament...
      </div>
    );
  }

  if (!event || !isGaming) {
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
                  Esports Tournament
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {event.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                The official bracket will be shared by the organiser and shown
                here once it is ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-accent/30 text-accent">
                {tournament?.status || "registration_open"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6"
        >
          <Card className="border-accent/20 bg-gradient-to-br from-background via-background to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" /> Tournament Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="text-sm text-muted-foreground">Game</div>
                  <div className="font-semibold">
                    {tournament?.game_name || "Valorant"}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="text-sm text-muted-foreground">Format</div>
                  <div className="font-semibold">
                    {tournament?.tournament_type || "Single Elimination"}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="text-sm text-muted-foreground">Teams</div>
                  <div className="font-semibold">{teams.length}</div>
                </div>
              </div>
              {liveOverlay ? (
                <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                  <div className="flex items-center gap-2 text-accent font-semibold">
                    <Radio className="h-4 w-4" /> Live Overlay Ready
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    OBS-ready match data can be pulled from the tournament
                    service for the featured match.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
                  No featured match is active yet. Toggle stream mode on a match
                  when you are live.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-accent" /> Register a
                Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterTeam} className="space-y-3">
                <div>
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Nova Protocol"
                  />
                </div>
                <div>
                  <Label htmlFor="teamPlayers">Roster</Label>
                  <Textarea
                    id="teamPlayers"
                    value={teamPlayers}
                    onChange={(e) => setTeamPlayers(e.target.value)}
                    placeholder="Player names, one per line"
                  />
                </div>
                <div>
                  <Label htmlFor="teamLogo">Team Logo URL</Label>
                  <Input
                    id="teamLogo"
                    value={teamLogo}
                    onChange={(e) => setTeamLogo(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="riotIds">Riot IDs</Label>
                  <Input
                    id="riotIds"
                    value={riotIds}
                    onChange={(e) => setRiotIds(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  Register Team
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {canManage && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-accent" /> Upload bracket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste a link to the bracket file or page. It will appear in the
                Bracket tab for everyone viewing the event.
              </p>
              <Input
                value={bracketUrlDraft}
                onChange={(e) => setBracketUrlDraft(e.target.value)}
                placeholder="https://..."
              />
              <Button onClick={handleSaveBracket} disabled={submitting}>
                Save bracket link
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" /> Teams & Seeds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No teams registered yet.
                </p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-xl border border-border/60 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{team.team_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Seed {team.team_seed ?? "—"}
                        </div>
                      </div>
                      {team.captain_id === user?.id && (
                        <Badge className="bg-accent/10 text-accent">
                          Your team
                        </Badge>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <Input
                          value={seedDrafts[team.id] ?? team.team_seed ?? ""}
                          onChange={(e) =>
                            setSeedDrafts((prev) => ({
                              ...prev,
                              [team.id]: e.target.value,
                            }))
                          }
                          className="h-8"
                          placeholder="Seed"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSeedChange(team.id)}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-accent" /> My Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You do not have a match scheduled yet.
                </p>
              ) : (
                myMatches.map((match) => {
                  const teamA = teamById[match.team_a_id || ""];
                  const teamB = teamById[match.team_b_id || ""];
                  return (
                    <div
                      key={match.id}
                      className="rounded-xl border border-border/60 p-3"
                    >
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Round {match.round_number}
                      </div>
                      <div className="font-semibold">
                        {teamA?.team_name || "TBD"} vs{" "}
                        {teamB?.team_name || "TBD"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Status: {match.match_status}
                      </div>
                      {match.scheduled_time ? (
                        <div className="text-sm text-muted-foreground">
                          {new Date(match.scheduled_time).toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Tournament Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-[900px] gap-4">
                {groupedMatches.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    The official bracket will be uploaded here later by the
                    organiser.
                  </div>
                ) : (
                  groupedMatches.map(([roundNumber, roundMatches]) => (
                    <div key={roundNumber} className="min-w-[240px] flex-1">
                      <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Round {roundNumber}
                      </div>
                      <div className="space-y-3">
                        {roundMatches.map((match) => {
                          const teamA = teamById[match.team_a_id || ""];
                          const teamB = teamById[match.team_b_id || ""];
                          const isWinnerA =
                            match.winner_id &&
                            match.winner_id === match.team_a_id;
                          const isWinnerB =
                            match.winner_id &&
                            match.winner_id === match.team_b_id;
                          return (
                            <div
                              key={match.id}
                              className="rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                                <span>Match {match.match_number}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 ${match.match_status === "live" ? "bg-red-500/15 text-red-400" : match.match_status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}
                                >
                                  {match.match_status}
                                </span>
                              </div>
                              <div
                                className={`mt-2 rounded-lg border p-2 ${isWinnerA ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/50"}`}
                              >
                                <div className="text-sm font-medium">
                                  {teamA?.team_name || "BYE"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Score {match.team_a_score ?? "—"}
                                </div>
                              </div>
                              <div className="my-2 text-center text-xs text-muted-foreground">
                                VS
                              </div>
                              <div
                                className={`rounded-lg border p-2 ${isWinnerB ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/50"}`}
                              >
                                <div className="mb-2 flex justify-end">
                                  <Link
                                    to={`/events/${slug}/matches/${match.id}`}
                                    className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent hover:text-accent/80"
                                  >
                                    Match Centre
                                  </Link>
                                </div>
                                <div className="text-sm font-medium">
                                  {teamB?.team_name || "BYE"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Score {match.team_b_score ?? "—"}
                                </div>
                              </div>
                              {canManage && (
                                <div className="mt-3 space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      value={
                                        scoreDrafts[match.id]?.teamA ??
                                        match.team_a_score ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        setScoreDrafts((prev) => ({
                                          ...prev,
                                          [match.id]: {
                                            teamA: e.target.value,
                                            teamB: prev[match.id]?.teamB ?? "",
                                          },
                                        }))
                                      }
                                      placeholder="A"
                                      className="h-8"
                                    />
                                    <Input
                                      type="number"
                                      value={
                                        scoreDrafts[match.id]?.teamB ??
                                        match.team_b_score ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        setScoreDrafts((prev) => ({
                                          ...prev,
                                          [match.id]: {
                                            teamA: prev[match.id]?.teamA ?? "",
                                            teamB: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="B"
                                      className="h-8"
                                    />
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSubmitResult(match.id)}
                                    className="w-full"
                                  >
                                    Submit Result
                                  </Button>
                                  <div className="flex gap-2">
                                    <Input
                                      type="datetime-local"
                                      value={
                                        matchTimeDrafts[match.id] ??
                                        (match.scheduled_time
                                          ? new Date(match.scheduled_time)
                                              .toISOString()
                                              .slice(0, 16)
                                          : "")
                                      }
                                      onChange={(e) =>
                                        setMatchTimeDrafts((prev) => ({
                                          ...prev,
                                          [match.id]: e.target.value,
                                        }))
                                      }
                                      className="h-8"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleSetMatchTime(match.id)
                                      }
                                    >
                                      Time
                                    </Button>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        updateTournamentMatch(match.id, {
                                          match_status: "live",
                                        }).then(() => refetchMatches())
                                      }
                                    >
                                      Live
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        updateTournamentMatch(match.id, {
                                          match_status: "completed",
                                        }).then(() => refetchMatches())
                                      }
                                    >
                                      Finish
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        updateTournamentMatch(match.id, {
                                          match_status: "disputed",
                                        }).then(() => refetchMatches())
                                      }
                                    >
                                      Dispute
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {canManage && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-accent" /> Tournament
                Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  updateTournamentMatch(matches[0]?.id || "", {
                    streamed_match: true,
                  }).catch(() => undefined)
                }
              >
                Feature Match
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  updateTournamentMatch(matches[0]?.id || "", {
                    streamed_match: false,
                  }).catch(() => undefined)
                }
              >
                Unfeature Match
              </Button>
              {tournament?.status !== "completed" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    updateTournamentStatus(tournament.id, "completed").then(
                      () => refetchTournament(),
                    )
                  }
                >
                  Mark Tournament Complete
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
