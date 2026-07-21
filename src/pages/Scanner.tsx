import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  Keyboard,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Users,
  Gamepad2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import type { OfflineManifest, ScanResult, GamingTicketMeta } from "@/domains/tickets/dtos/ticket.dto";
import {
  saveManifest,
  getManifest,
  queueScan,
  getQueuedScans,
  recordRecentScan,
  getRecentScans,
  type RecentScanRecord,
} from "@/lib/offlineTicketStore";
import { evaluateLocalScan, applyOptimisticCheckIn } from "@/lib/offlineScanLogic";
import { syncPendingScans } from "@/lib/offlineSyncEngine";

interface ScannableEvent {
  id: string;
  title: string;
  slug: string;
  ticket_gates: string[];
  ticketing_enabled: boolean;
}

interface ScanFeedback {
  result: ScanResult;
  participantName?: string;
  teamName?: string | null;
  ticketType?: string;
  gamingMeta?: GamingTicketMeta | null;
  previousCheckInAt?: string | null;
  previousScannedByName?: string | null;
  fromCache?: boolean;
}

const RESULT_STYLES: Record<ScanResult, { label: string; bg: string; text: string; Icon: typeof CheckCircle2 }> = {
  VALID: { label: "Valid ticket", bg: "bg-emerald-500", text: "text-white", Icon: CheckCircle2 },
  DUPLICATE: { label: "Already checked in", bg: "bg-amber-500", text: "text-white", Icon: AlertTriangle },
  CANCELLED: { label: "Ticket cancelled", bg: "bg-destructive", text: "text-white", Icon: XCircle },
  WRONG_EVENT: { label: "Wrong event", bg: "bg-destructive", text: "text-white", Icon: XCircle },
  INVALID: { label: "Invalid ticket", bg: "bg-destructive", text: "text-white", Icon: XCircle },
};

export default function Scanner() {
  const { user, session } = useAuth();
  const [events, setEvents] = useState<ScannableEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedGate, setSelectedGate] = useState<string>("");
  const [manifest, setManifest] = useState<OfflineManifest | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentScans, setRecentScans] = useState<RecentScanRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const deviceIdRef = useRef<string>(getOrCreateDeviceId());

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  // Load events this user can scan for: owned events, plus any event_staff grant.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: owned }, { data: staffGrants }] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, slug, ticket_gates, ticketing_enabled")
          .eq("created_by", user.id)
          .eq("ticketing_enabled", true),
        supabase.from("event_staff").select("event_id").eq("user_id", user.id),
      ]);

      let staffEvents: ScannableEvent[] = [];
      const staffEventIds = (staffGrants ?? []).map((g: { event_id: string }) => g.event_id);
      if (staffEventIds.length > 0) {
        const { data } = await supabase
          .from("events")
          .select("id, title, slug, ticket_gates, ticketing_enabled")
          .in("id", staffEventIds)
          .eq("ticketing_enabled", true);
        staffEvents = data ?? [];
      }

      const merged = [...(owned ?? []), ...staffEvents];
      const deduped = Array.from(new Map(merged.map((e) => [e.id, e])).values());
      setEvents(deduped);
      if (deduped.length === 1) setSelectedEventId(deduped[0].id);
    })();
  }, [user]);

  // Confirm authorization + download/refresh the offline manifest whenever
  // the selected event changes.
  useEffect(() => {
    if (!selectedEventId || !session?.access_token) {
      setAuthorized(null);
      return;
    }
    (async () => {
      setManifestLoading(true);
      setAuthorized(null);
      try {
        const res = await fetch(`/api/tickets/manifest?event_id=${selectedEventId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 403) {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        if (res.ok) {
          const body = await res.json();
          await saveManifest(body.manifest);
          setManifest(body.manifest);
        } else {
          // Offline or request failed — fall back to whatever we already
          // have cached locally for this event, if anything.
          const cached = await getManifest(selectedEventId);
          setManifest(cached);
        }
      } catch {
        const cached = await getManifest(selectedEventId);
        setManifest(cached);
        setAuthorized(cached ? true : null);
      } finally {
        setManifestLoading(false);
      }
    })();
  }, [selectedEventId, session?.access_token]);

  // Track online/offline and drive auto-sync.
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      if (selectedEventId) void runSync();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  // Periodic sync sweep + pending-count/recent-scans refresh.
  useEffect(() => {
    if (!selectedEventId) return;
    const refresh = async () => {
      setPendingCount((await getQueuedScans(selectedEventId)).length);
      setRecentScans(await getRecentScans(selectedEventId, 15));
    };
    refresh();
    const interval = setInterval(() => {
      refresh();
      if (navigator.onLine) void runSync();
    }, 15_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  const runSync = useCallback(async () => {
    if (!selectedEventId) return;
    setSyncing(true);
    try {
      await syncPendingScans(selectedEventId, async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      });
    } finally {
      setSyncing(false);
      setPendingCount((await getQueuedScans(selectedEventId)).length);
    }
  }, [selectedEventId]);

  const processScan = useCallback(
    async (rawValue: string) => {
      if (!selectedEventId || !user) return;

      // Accept either a bare token or a full /ticket/<token> URL (the QR
      // encodes the full URL — see src/pages/Ticket.tsx — but manual entry
      // should also accept someone typing/pasting just the token or the
      // short ticket code).
      const qrToken = extractToken(rawValue);

      // Debounce: the camera loop runs several times a second, and the
      // same physical QR code will be in frame for many of those ticks —
      // without this, one scan becomes a dozen requests.
      const now = Date.now();
      if (lastScanRef.current.value === qrToken && now - lastScanRef.current.at < 3000) {
        return;
      }
      lastScanRef.current = { value: qrToken, at: now };

      const clientScanId = crypto.randomUUID();
      const scannedAt = new Date().toISOString();

      // Instant local feedback from the cached manifest — this is what
      // keeps the scanner feeling fast (requirement 14) regardless of
      // network conditions, and is the ONLY path used while offline.
      const local = evaluateLocalScan(manifest, qrToken);
      setFeedback({
        result: local.result,
        participantName: local.participantName,
        teamName: local.teamName,
        ticketType: local.ticketType,
        gamingMeta: local.gamingMeta,
        fromCache: true,
      });

      if (local.result === "VALID" && manifest) {
        const updated = applyOptimisticCheckIn(manifest, qrToken);
        setManifest(updated);
        await saveManifest(updated);
      }

      await recordRecentScan({
        clientScanId,
        eventId: selectedEventId,
        qrToken,
        result: local.result,
        participantName: local.participantName,
        scannedAt,
        synced: false,
      });
      setRecentScans(await getRecentScans(selectedEventId, 15));

      if (!navigator.onLine) {
        // Queue for later — only VALID/first-seen scans are worth
        // queuing; a locally-detected duplicate/invalid/cancelled scan
        // has nothing new to tell the server once it's caught up on the
        // same manifest data, so queuing it would just be a wasted sync
        // request. (If the local manifest is stale and it turns out NOT
        // to have been a duplicate, the manifest refresh on next online
        // connection will catch that on the next real scan attempt.)
        if (local.result === "VALID") {
          await queueScan({
            clientScanId,
            eventId: selectedEventId,
            qrToken,
            deviceId: deviceIdRef.current,
            gate: selectedGate || undefined,
            scannedAt,
            synced: false,
          });
          setPendingCount((await getQueuedScans(selectedEventId)).length);
        }
        return;
      }

      // Online — confirm with the server immediately rather than waiting
      // for the periodic sync sweep, so the volunteer sees the
      // authoritative result (e.g. someone else already checked this
      // ticket in at another gate) right away.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;

        const res = await fetch("/api/tickets/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            qr_token: qrToken,
            event_id: selectedEventId,
            client_scan_id: clientScanId,
            device_id: deviceIdRef.current,
            gate: selectedGate || undefined,
            offline: false,
            scanned_at: scannedAt,
          }),
        });

        const body = await res.json();
        if (res.ok) {
          setFeedback({
            result: body.result,
            participantName: body.participant_name,
            teamName: body.team_name,
            ticketType: body.ticket?.ticket_type,
            gamingMeta: body.ticket?.gaming_meta,
            previousCheckInAt: body.previous_check_in_at,
            previousScannedByName: body.previous_scanned_by_name,
            fromCache: false,
          });
        }
      } catch {
        // Request failed despite navigator.onLine reporting true (flaky
        // connection) — the optimistic local result already shown stands,
        // and since we didn't queue a non-VALID result, only a VALID scan
        // needs a fallback here. Queue it so it still syncs later.
        if (local.result === "VALID") {
          await queueScan({
            clientScanId,
            eventId: selectedEventId,
            qrToken,
            deviceId: deviceIdRef.current,
            gate: selectedGate || undefined,
            scannedAt,
            synced: false,
          });
          setPendingCount((await getQueuedScans(selectedEventId)).length);
        }
      }
    },
    [selectedEventId, selectedGate, manifest, user],
  );

  // Camera loop
  useEffect(() => {
    if (!cameraOn) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch {
        setCameraOn(false);
      }
    })();

    function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code?.data) {
            void processScan(code.data);
          }
        }
      }
      scanLoopRef.current = requestAnimationFrame(tick);
    }

    return () => {
      cancelled = true;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn, processScan]);

  // Auto-dismiss the result card so the next scan doesn't require a tap.
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    void processScan(manualCode.trim());
    setManualCode("");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar: event/gate selectors + connectivity status */}
      <div className="border-b border-border bg-card px-4 py-3 flex flex-wrap items-center gap-3">
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="flex-1 min-w-[160px] bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value="">Select event…</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>

        {selectedEvent && selectedEvent.ticket_gates.length > 0 && (
          <select
            value={selectedGate}
            onChange={(e) => setSelectedGate(e.target.value)}
            className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          >
            <option value="">Any gate</option>
            {selectedEvent.ticket_gates.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2 ml-auto text-xs">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <Wifi className="w-4 h-4" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-500">
              <WifiOff className="w-4 h-4" /> Offline
            </span>
          )}
          {pendingCount > 0 && (
            <Button variant="outline" size="sm" onClick={runSync} disabled={syncing || !isOnline} className="h-7 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {pendingCount} pending
            </Button>
          )}
        </div>
      </div>

      {!selectedEventId ? (
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <p className="text-muted-foreground text-sm">
            {events.length === 0
              ? "No events found where you're authorized to scan tickets."
              : "Select an event above to start scanning."}
          </p>
        </div>
      ) : authorized === false ? (
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-semibold mb-1">Not authorized</p>
            <p className="text-muted-foreground text-sm">
              You don't have scanner access for this event. Ask the event organiser to grant it.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {manifestLoading && !manifest && (
            <p className="text-center text-xs text-muted-foreground py-2">Loading ticket data…</p>
          )}
          {manifest && (
            <p className="text-center text-[11px] text-muted-foreground py-1.5 flex items-center justify-center gap-1">
              <Download className="w-3 h-3" />
              {manifest.tickets.length} tickets cached for offline use
            </p>
          )}

          {/* Camera view */}
          <div className="relative aspect-square max-w-md mx-auto w-full bg-black rounded-xl overflow-hidden my-3">
            {cameraOn ? (
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <button
                onClick={() => setCameraOn(true)}
                className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/70"
              >
                <Camera className="w-12 h-12" />
                <span className="text-sm">Tap to start camera</span>
              </button>
            )}
            <canvas ref={canvasRef} className="hidden" />
            {cameraOn && (
              <>
                <div className="absolute inset-8 border-2 border-accent/60 rounded-2xl pointer-events-none" />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-3 right-3 bg-background/80"
                  onClick={() => setCameraOn(false)}
                  aria-label="Stop camera"
                >
                  <CameraOff className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Result overlay */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setFeedback(null)}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center cursor-pointer ${RESULT_STYLES[feedback.result].bg} ${RESULT_STYLES[feedback.result].text}`}
                >
                  {(() => {
                    const Icon = RESULT_STYLES[feedback.result].Icon;
                    return <Icon className="w-16 h-16" />;
                  })()}
                  <p className="text-xl font-display font-bold">{RESULT_STYLES[feedback.result].label}</p>
                  {feedback.participantName && (
                    <p className="text-lg font-semibold">{feedback.participantName}</p>
                  )}
                  {feedback.teamName && (
                    <p className="text-sm opacity-90 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {feedback.teamName}
                    </p>
                  )}
                  {feedback.ticketType && (
                    <p className="text-xs opacity-80 uppercase tracking-wide">{feedback.ticketType}</p>
                  )}
                  {feedback.gamingMeta && Object.values(feedback.gamingMeta).some(Boolean) && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                      {Object.entries(feedback.gamingMeta)
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <span key={k} className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 flex items-center gap-1">
                            <Gamepad2 className="w-2.5 h-2.5" /> {k}: {v}
                          </span>
                        ))}
                    </div>
                  )}
                  {feedback.result === "DUPLICATE" && feedback.previousCheckInAt && (
                    <p className="text-xs opacity-90 mt-1">
                      Previously checked in {new Date(feedback.previousCheckInAt).toLocaleTimeString()}
                      {feedback.previousScannedByName ? ` by ${feedback.previousScannedByName}` : ""}
                    </p>
                  )}
                  <p className="text-[10px] opacity-60 mt-2">Tap to dismiss</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Manual entry */}
          <form onSubmit={handleManualSubmit} className="flex gap-2 px-4 max-w-md mx-auto w-full">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter ticket code manually"
                className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground"
              />
            </div>
            <Button type="submit" disabled={!manualCode.trim()}>
              Check in
            </Button>
          </form>

          {/* Recent scans */}
          {recentScans.length > 0 && (
            <div className="px-4 mt-4 pb-6 max-w-md mx-auto w-full">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Recent scans
              </p>
              <div className="space-y-1.5">
                {recentScans.map((scan) => (
                  <div
                    key={scan.clientScanId}
                    className="flex items-center justify-between text-xs bg-card border border-border rounded-lg px-3 py-2"
                  >
                    <span className="text-foreground truncate">{scan.participantName || scan.qrToken.slice(0, 8)}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {!scan.synced && <span className="text-amber-500">●</span>}
                      {RESULT_STYLES[scan.result as ScanResult]?.label ?? scan.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function extractToken(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const ticketIdx = parts.indexOf("ticket");
    if (ticketIdx !== -1 && parts[ticketIdx + 1]) return parts[ticketIdx + 1];
  } catch {
    // not a URL — fall through to treating it as a bare token/code
  }
  return trimmed;
}

function getOrCreateDeviceId(): string {
  const key = "repdox-scanner-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
