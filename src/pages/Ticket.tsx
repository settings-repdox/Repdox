import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";
import {
  Download,
  Printer,
  Share2,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Ticket as TicketIcon,
  Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { GamingTicketMeta, TicketStatus } from "@/domains/tickets/dtos/ticket.dto";

interface TicketPageData {
  id: string;
  ticket_code: string;
  qr_token: string;
  status: TicketStatus;
  ticket_type: string;
  gaming_meta?: GamingTicketMeta | null;
  checked_in_at?: string | null;
  event_title: string;
  event_start_at: string;
  event_location: string;
  event_image_url?: string | null;
  event_format?: string | null;
  participant_name: string;
  team_name?: string | null;
  registered_at?: string;
}

const STATUS_STYLES: Record<TicketStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  VALID: { label: "Valid", className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle2 },
  USED: { label: "Checked in", className: "text-accent bg-accent/10 border-accent/30", Icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", className: "text-destructive bg-destructive/10 border-destructive/30", Icon: XCircle },
};

export default function Ticket() {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<TicketPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/tickets/get?token=${encodeURIComponent(token)}`);
        const body = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          setError(body.error || "Ticket not found");
        } else {
          setTicket(body.ticket);
        }
      } catch {
        if (mounted) setError("Couldn't load this ticket — check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const qrValue = token ? `${window.location.origin}/ticket/${token}` : "";

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `repdox-ticket-${ticket?.ticket_code ?? "ticket"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (navigator.share && token) {
      try {
        await navigator.share({
          title: `${ticket?.event_title ?? "Repdox"} ticket`,
          url: qrValue,
        });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
    } else {
      await navigator.clipboard.writeText(qrValue);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64 w-64 mx-auto rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Ticket not found</h1>
          <p className="text-muted-foreground text-sm">
            {error ?? "This ticket link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[ticket.status];
  const eventDate = ticket.event_start_at
    ? new Date(ticket.event_start_at).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const registeredDate = ticket.registered_at
    ? new Date(ticket.registered_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-background bg-gradient-subtle px-4 py-12 print:bg-white print:py-0">
      <div className="max-w-md mx-auto">
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg print:shadow-none print:border-2"
        >
          {/* Event banner */}
          <div className="relative h-36 bg-secondary overflow-hidden">
            {ticket.event_image_url ? (
              <img
                src={ticket.event_image_url}
                alt={ticket.event_title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-subtle">
                <TicketIcon className="w-10 h-10 text-accent/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <span className="w-2 h-2 rounded-sm bg-accent inline-block mr-1.5 align-middle" />
              <span className="font-display text-xs font-bold tracking-[0.1em] text-foreground align-middle">
                REPDOX
              </span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <h1 className="font-display text-xl font-bold text-foreground leading-tight mb-2">
                {ticket.event_title}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {eventDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {eventDate}
                  </span>
                )}
                {ticket.event_location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {ticket.event_location}
                  </span>
                )}
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusStyle.className}`}
            >
              <statusStyle.Icon className="w-3.5 h-3.5" />
              {statusStyle.label}
              {ticket.status === "USED" && ticket.checked_in_at && (
                <span className="opacity-70 font-normal">
                  · {new Date(ticket.checked_in_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            {/* QR code — carries only the ticket URL/token, never PII (see
                ADR 0007 / docs/api/README.md). */}
            <div className="flex justify-center py-4 bg-white rounded-xl border border-border">
              <QRCode value={qrValue} size={200} />
            </div>

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ticket number</p>
              <p className="font-mono text-lg font-semibold text-foreground tracking-wider">{ticket.ticket_code}</p>
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participant</span>
                <span className="font-medium text-foreground">{ticket.participant_name || "—"}</span>
              </div>
              {ticket.team_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Team
                  </span>
                  <span className="font-medium text-foreground">{ticket.team_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket type</span>
                <span className="font-medium text-foreground capitalize">{ticket.ticket_type}</span>
              </div>
              {registeredDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registered</span>
                  <span className="font-medium text-foreground">{registeredDate}</span>
                </div>
              )}
            </div>

            {ticket.gaming_meta && Object.values(ticket.gaming_meta).some(Boolean) && (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-accent" /> Gaming details
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {ticket.gaming_meta.game && <GamingField label="Game" value={ticket.gaming_meta.game} />}
                  {ticket.gaming_meta.ign && <GamingField label="IGN" value={ticket.gaming_meta.ign} />}
                  {ticket.gaming_meta.player_number && (
                    <GamingField label="Player #" value={ticket.gaming_meta.player_number} />
                  )}
                  {ticket.gaming_meta.seat && <GamingField label="Seat" value={ticket.gaming_meta.seat} />}
                  {ticket.gaming_meta.discord && <GamingField label="Discord" value={ticket.gaming_meta.discord} />}
                  {ticket.gaming_meta.steam_id && <GamingField label="Steam ID" value={ticket.gaming_meta.steam_id} />}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Actions — hidden when printing */}
        <div className="flex gap-2 mt-6 print:hidden">
          <Button variant="outline" className="flex-1" onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4 mr-2" /> {downloading ? "Saving..." : "Download"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare} aria-label="Share ticket">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 print:hidden">
          Tip: open this page on your phone and use your browser's "Add to Home Screen"
          option to save your ticket for quick, offline access at the event.
        </p>
      </div>
    </div>
  );
}

function GamingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg px-2.5 py-1.5">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-foreground font-medium truncate">{value}</p>
    </div>
  );
}
