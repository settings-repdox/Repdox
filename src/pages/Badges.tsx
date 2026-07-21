import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveService } from "@/core/services/di";
import type { IEventService } from "@/domains/events/interfaces/IEventService";
import { ADMIN_EMAILS } from "@/lib/adminService";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BadgeRole, TicketWithContext } from "@/domains/tickets/dtos/ticket.dto";

const eventServiceCore = () => resolveService<IEventService>("EventService");

const ROLE_COLORS: Record<BadgeRole, string> = {
  participant: "#e0a530", // accent
  volunteer: "#3b82f6",
  judge: "#a855f7",
  sponsor: "#10b981",
  media: "#ec4899",
  staff: "#64748b",
};

export default function Badges() {
  const { slug } = useParams();
  const [roleFilter, setRoleFilter] = useState<string>("");

  const { data: event, isLoading: eventLoading } = useQuery({
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

      // Badge data comes from GET /api/tickets/search, which requires
      // "staff" tier or above (see api/tickets/_utils.ts) — match that
      // here rather than blocking a legitimately-authorized staff-tier
      // grantee before they even reach the API call.
      let staffRole: "organizer" | "staff" | "volunteer" | null = null;
      if (!isOwner && !isAdmin && user) {
        const { data: staffRow } = await supabase
          .from("event_staff")
          .select("role")
          .eq("event_id", eventData.id)
          .eq("user_id", user.id)
          .maybeSingle();
        staffRole = (staffRow?.role as typeof staffRole) ?? null;
      }
      const canView = isOwner || isAdmin || staffRole === "organizer" || staffRole === "staff";
      if (!canView) throw new Error("Unauthorized");
      return eventData;
    },
    retry: false,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketWithContext[]>({
    queryKey: ["badges", event?.id],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(`/api/tickets/search?event_id=${event!.id}&status=`, {
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });
      const body = await res.json();
      return body.tickets ?? [];
    },
    enabled: !!event?.id,
  });

  const filtered = (tickets ?? []).filter((t) => !roleFilter || t.ticket_type === roleFilter);

  if (eventLoading || ticketsLoading) {
    return (
      <div className="min-h-screen bg-background px-6 py-10 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @media print {
          @page { size: A6; margin: 4mm; }
          body * { visibility: hidden; }
          #badge-print-area, #badge-print-area * { visibility: visible; }
          #badge-print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .badge-card { page-break-after: always; }
        }
      `}</style>

      <div className="px-4 sm:px-6 py-10 max-w-4xl mx-auto print:hidden">
        <Link
          to={`/events/${slug}/tickets`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to ticketing
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Badges — {event?.title}</h1>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg px-3 text-sm text-foreground"
            >
              <option value="">All roles</option>
              {Object.keys(ROLE_COLORS).map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Print {filtered.length} badges
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          A6-sized, one badge per printed page — designed to be cut/perforated normally by
          your printer's paper settings. Each badge's QR code is that person's check-in
          ticket, so a badge doubles as their entry pass.
        </p>
      </div>

      {/* Screen preview grid + the actual print content */}
      <div id="badge-print-area" className="px-4 sm:px-6 pb-10 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 print:block print:px-0">
        {filtered.map((ticket) => (
          <BadgeCard key={ticket.id} ticket={ticket} eventTitle={event?.title ?? ""} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12 col-span-2 print:hidden">
            No tickets match this filter.
          </p>
        )}
      </div>
    </div>
  );
}

function BadgeCard({ ticket, eventTitle }: { ticket: TicketWithContext; eventTitle: string }) {
  const role = (ticket.ticket_type as BadgeRole) ?? "participant";
  const color = ROLE_COLORS[role] ?? ROLE_COLORS.participant;

  return (
    <div
      className="badge-card bg-white rounded-xl overflow-hidden border border-border shadow-sm print:shadow-none print:border-2 print:rounded-none"
      style={{ width: "105mm", height: "148mm", maxWidth: "100%" }}
    >
      {/* Colour strip based on role */}
      <div style={{ backgroundColor: color }} className="h-3 w-full" />

      <div className="p-6 flex flex-col items-center text-center h-full">
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-400 mb-1">REPDOX</span>
        <p className="text-xs text-gray-500 mb-6">{eventTitle}</p>

        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-gray-900 mb-1">{ticket.participant_name || "—"}</p>
          {ticket.team_name && <p className="text-sm text-gray-500 mb-4">{ticket.team_name}</p>}

          <div className="bg-white p-3 border border-gray-200 rounded-lg">
            <QRCode value={ticket.qr_token} size={110} />
          </div>
        </div>

        <div
          className="mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: color }}
        >
          {role}
        </div>
      </div>
    </div>
  );
}
