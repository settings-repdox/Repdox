import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ticket as TicketIcon, ChevronRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { TicketWithContext } from "@/domains/tickets/dtos/ticket.dto";

export default function MyTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch("/api/tickets/my", { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      setTickets(body.tickets ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-10 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">My Tickets</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Every ticket for an event you've registered for. Tap one to view its QR code.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16">
          <TicketIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No tickets yet — register for an event with ticketing enabled to see one here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/ticket/${ticket.qr_token}`}
              className="surface-card flex items-center gap-4 p-4"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <TicketIcon className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{ticket.event_title}</p>
                <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_code}</p>
              </div>
              {ticket.status === "USED" ? (
                <span className="flex items-center gap-1 text-xs text-emerald-500 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Checked in
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
