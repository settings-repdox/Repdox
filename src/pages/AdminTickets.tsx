import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Ticket as TicketIcon,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Download,
  XCircle,
  RefreshCcw,
  Settings,
  Loader2,
  Printer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveService } from "@/core/services/di";
import type { IEventService } from "@/domains/events/interfaces/IEventService";
import { ADMIN_EMAILS } from "@/lib/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttendanceStats, TicketWithContext } from "@/domains/tickets/dtos/ticket.dto";

const eventServiceCore = () => resolveService<IEventService>("EventService");

async function authedFetch(
  path: string,
  session: { access_token: string } | null | undefined,
  options: RequestInit = {},
) {
  if (!session?.access_token) throw new Error("Not authenticated");
  const res = await fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

export default function AdminTickets() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Event slug is required");
      const eventData = await eventServiceCore().getEventBySlug(slug);
      if (!eventData) throw new Error("Event not found");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isOwner = user && eventData.created_by === user.id;
      const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;
      if (!isOwner && !isAdmin) throw new Error("Unauthorized");

      return eventData;
    },
    retry: false,
  });

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AttendanceStats>({
    queryKey: ["ticket-stats", event?.id],
    queryFn: async () => (await authedFetch(`/api/tickets/stats?event_id=${event!.id}`, session)).stats,
    enabled: !!event?.id && !!session,
    refetchInterval: 15_000,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery<TicketWithContext[]>({
    queryKey: ["ticket-search", event?.id, searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ event_id: event!.id });
      if (searchTerm) params.set("q", searchTerm);
      if (statusFilter) params.set("status", statusFilter);
      return (await authedFetch(`/api/tickets/search?${params}`, session)).tickets;
    },
    enabled: !!event?.id && !!session,
  });

  const enableMutation = useMutation({
    mutationFn: async (enabled: boolean) =>
      authedFetch("/api/tickets/enable", session, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event!.id, enabled }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event", slug] }),
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason?: string }) =>
      authedFetch("/api/tickets/cancel", session, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-search"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
  });

  const reissueMutation = useMutation({
    mutationFn: async (ticketId: string) =>
      authedFetch("/api/tickets/reissue", session, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-search"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
  });

  const handleExportCsv = async () => {
    if (!session || !event) return;
    const res = await fetch(`/api/tickets/search?event_id=${event.id}&status=`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json();
    const tickets: TicketWithContext[] = body.tickets ?? [];
    const header = ["ticket_code", "participant_name", "team_name", "ticket_type", "status", "checked_in_at"];
    const rows = tickets.map((t) =>
      [t.ticket_code, t.participant_name, t.team_name ?? "", t.ticket_type, t.status, t.checked_in_at ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${event.slug}-attendance.csv`;
    link.click();
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background px-6 py-10 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <p className="text-foreground font-semibold">
            {eventError instanceof Error ? eventError.message : "Event not found"}
          </p>
          <Link to="/events" className="text-accent text-sm mt-2 inline-block">
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-10 max-w-5xl mx-auto">
      <Link to={`/events/${event.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to event
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Ticketing — {event.title}</h1>
        <div className="flex gap-2">
          <Link to={`/events/${event.slug}/badges`}>
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-1.5" /> Badges
            </Button>
          </Link>
          <Link to="/scanner">
            <Button variant="outline" size="sm">
              <TicketIcon className="w-4 h-4 mr-1.5" /> Open Scanner
            </Button>
          </Link>
        </div>
      </div>

      {!event.ticketing_enabled ? (
        <div className="surface-card p-6 text-center">
          <Settings className="w-8 h-8 text-accent mx-auto mb-3" />
          <p className="text-foreground font-semibold mb-1">Ticketing isn't enabled for this event yet</p>
          <p className="text-muted-foreground text-sm mb-4">
            Turning it on generates tickets for every existing confirmed registration, and
            automatically for every new one going forward.
          </p>
          <Button onClick={() => enableMutation.mutate(true)} disabled={enableMutation.isPending}>
            {enableMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Enable Ticketing
          </Button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Users} label="Registered" value={stats?.registered} loading={statsLoading} />
            <StatCard icon={TicketIcon} label="Tickets Issued" value={stats?.ticketsIssued} loading={statsLoading} />
            <StatCard icon={CheckCircle2} label="Checked In" value={stats?.checkedIn} loading={statsLoading} accent />
            <StatCard icon={Clock} label="Remaining" value={stats?.remaining} loading={statsLoading} />
          </div>

          {/* Recent scans */}
          {stats && stats.recentScans.length > 0 && (
            <div className="surface-card p-5 mb-6">
              <h2 className="font-display font-semibold text-foreground mb-3">Recent Scans</h2>
              <div className="space-y-1.5">
                {stats.recentScans.slice(0, 8).map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-foreground">{scan.participantName ?? scan.ticketCode ?? "—"}</span>
                    <span className="text-muted-foreground text-xs">
                      {scan.result} · {new Date(scan.scannedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search + actions */}
          <div className="surface-card p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or ticket code…"
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-secondary/50 border border-border rounded-lg px-3 text-sm text-foreground"
              >
                <option value="">All statuses</option>
                <option value="VALID">Valid</option>
                <option value="USED">Checked in</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <Button variant="outline" onClick={handleExportCsv}>
                <Download className="w-4 h-4 mr-1.5" /> Export CSV
              </Button>
            </div>

            {searchLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(searchResults ?? []).map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground text-sm">{ticket.participant_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reissueMutation.mutate(ticket.id)}
                        disabled={reissueMutation.isPending}
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </Button>
                      {ticket.status !== "CANCELLED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeMutation.mutate({ ticketId: ticket.id, reason: "Revoked by organiser" })}
                          disabled={revokeMutation.isPending}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
                {(searchResults ?? []).length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No tickets found.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value?: number;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="surface-card p-4">
      <Icon className={`w-4 h-4 mb-2 ${accent ? "text-accent" : "text-muted-foreground"}`} />
      {loading ? (
        <Skeleton className="h-7 w-12" />
      ) : (
        <p className={`text-2xl font-display font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value ?? 0}</p>
      )}
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    VALID: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    USED: "bg-accent/10 text-accent border-accent/30",
    CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
