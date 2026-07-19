/**
 * Consolidated Ticketing API — /api/tickets/[action]
 *
 * Vercel's Hobby plan caps a deployment at 12 Serverless Functions total.
 * The ticketing system's 13 originally-separate route files
 * (api/tickets/get.ts, checkin.ts, sync.ts, ...) exceeded that limit on
 * their own, on top of the 7 pre-existing routes elsewhere under api/.
 * This single dynamic-route file collapses all 13 into one function,
 * dispatching internally on the URL's action segment plus HTTP method.
 *
 * URLs are UNCHANGED from the client's perspective — Vercel maps a
 * bracketed path segment like [action].ts to whatever the request's
 * actual path segment is, so `GET /api/tickets/get?token=X` still routes
 * here with `req.query.action === "get"` and every other query param
 * intact. No frontend code needed to change.
 *
 * Each action's logic below is otherwise unchanged from its original
 * standalone file — see docs/api/README.md and ADR 0007 for what each
 * one does, and git history for the original per-file versions if a diff
 * against "before consolidation" is ever needed.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, requireAuth } from "../_utils.js";
import { isAuthorizedTicketStaff, isGlobalAdmin } from "./_utils.js";

const supabase = getSupabaseAdmin();
const MAX_SYNC_BATCH_SIZE = 500;

// ---------------------------------------------------------------------
// GET /api/tickets/get?token=
// ---------------------------------------------------------------------
async function handleGet(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
  if (!token || token.length < 16) {
    return res.status(400).json({ error: "Missing or malformed token", code: "invalid_token" });
  }

  const { data, error } = await supabase
    .from("tickets")
    .select(
      "*, events(title, start_at, location, image_url, format), event_registrations(name, team_id, created_at)",
    )
    .eq("qr_token", token)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: "Ticket not found", code: "not_found" });
  }

  const event = (data as any).events ?? {};
  const registration = (data as any).event_registrations ?? {};

  return res.status(200).json({
    ticket: {
      id: data.id,
      event_id: data.event_id,
      registration_id: data.registration_id,
      ticket_code: data.ticket_code,
      qr_token: data.qr_token,
      status: data.status,
      ticket_type: data.ticket_type,
      gaming_meta: data.gaming_meta,
      checked_in_at: data.checked_in_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
      event_title: event.title ?? "",
      event_start_at: event.start_at ?? "",
      event_location: event.location ?? "",
      event_image_url: event.image_url ?? null,
      event_format: event.format ?? null,
      participant_name: registration.name ?? "",
      team_name: registration.team_id ?? null,
      registered_at: registration.created_at ?? data.created_at,
    },
  });
}

// ---------------------------------------------------------------------
// GET /api/tickets/my
// ---------------------------------------------------------------------
async function handleMy(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const { data: registrations, error: regError } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("user_id", userId);

  if (regError) return res.status(500).json({ error: "Failed to load registrations" });

  const registrationIds = (registrations ?? []).map((r) => r.id);
  if (registrationIds.length === 0) return res.status(200).json({ tickets: [] });

  const { data, error } = await supabase
    .from("tickets")
    .select(
      "*, events(title, start_at, location, image_url, format), event_registrations(name, team_id)",
    )
    .in("registration_id", registrationIds)
    .neq("status", "CANCELLED")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: "Failed to load tickets" });

  const tickets = (data ?? []).map((row: any) => ({
    id: row.id,
    event_id: row.event_id,
    registration_id: row.registration_id,
    ticket_code: row.ticket_code,
    qr_token: row.qr_token,
    status: row.status,
    ticket_type: row.ticket_type,
    gaming_meta: row.gaming_meta,
    checked_in_at: row.checked_in_at,
    created_at: row.created_at,
    event_title: row.events?.title ?? "",
    event_start_at: row.events?.start_at ?? "",
    event_location: row.events?.location ?? "",
    event_image_url: row.events?.image_url ?? null,
    participant_name: row.event_registrations?.name ?? "",
    team_name: row.event_registrations?.team_id ?? null,
  }));

  return res.status(200).json({ tickets });
}

// ---------------------------------------------------------------------
// POST /api/tickets/generate
// ---------------------------------------------------------------------
async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const { registration_id } = req.body ?? {};
  if (!registration_id) {
    return res.status(400).json({ error: "registration_id is required", code: "invalid_input" });
  }

  const { data: registration } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("id", registration_id)
    .maybeSingle();
  if (!registration) return res.status(404).json({ error: "Registration not found", code: "not_found" });

  const authorized = await isAuthorizedTicketStaff(supabase, userId, registration.event_id);
  if (!authorized) return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });

  const { data, error } = await supabase.rpc("generate_ticket_for_registration", {
    p_registration_id: registration_id,
  });

  if (error) {
    const code = error.message?.includes("ticketing_not_enabled") ? "ticketing_not_enabled" : "generate_failed";
    return res.status(400).json({ error: error.message, code });
  }

  return res.status(200).json({ ticket: data });
}

// ---------------------------------------------------------------------
// POST /api/tickets/checkin
// ---------------------------------------------------------------------
async function handleCheckin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const { qr_token, event_id, client_scan_id, device_id, gate, offline, scanned_at } = req.body ?? {};

  if (!qr_token || typeof qr_token !== "string") {
    return res.status(400).json({ error: "qr_token is required", code: "invalid_input" });
  }
  if (!event_id || typeof event_id !== "string") {
    return res.status(400).json({ error: "event_id is required", code: "invalid_input" });
  }
  if (!client_scan_id || typeof client_scan_id !== "string") {
    return res.status(400).json({ error: "client_scan_id is required", code: "invalid_input" });
  }

  const authorized = await isAuthorizedTicketStaff(supabase, userId, event_id);
  if (!authorized) {
    return res.status(403).json({ error: "Not authorized to scan tickets for this event", code: "forbidden" });
  }

  const { data: quotaCheck, error: quotaError } = await supabase.rpc("check_and_increment_quota", {
    p_user_id: userId,
    p_ip: null,
    p_action: "ticket_checkin",
  });
  if (quotaError) {
    console.error("Quota check error (failing open):", quotaError);
  } else if (quotaCheck?.[0]?.allowed === false) {
    return res.status(429).json({
      error: "Scan rate limit reached — contact an organiser to raise it for this event",
      code: "quota_exceeded",
    });
  }

  const { data, error } = await supabase.rpc("check_in_ticket", {
    p_qr_token: qr_token,
    p_event_id: event_id,
    p_scanned_by: userId,
    p_client_scan_id: client_scan_id,
    p_device_id: device_id ?? null,
    p_gate: gate ?? null,
    p_offline: !!offline,
    p_scanned_at: scanned_at ?? new Date().toISOString(),
  });

  if (error) {
    console.error("Check-in RPC error:", error);
    return res.status(500).json({ error: "Check-in failed", code: "checkin_failed" });
  }

  return res.status(200).json(data);
}

// ---------------------------------------------------------------------
// POST /api/tickets/sync
// ---------------------------------------------------------------------
async function handleSync(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const { event_id, scans } = req.body ?? {};
  if (!event_id || typeof event_id !== "string") {
    return res.status(400).json({ error: "event_id is required", code: "invalid_input" });
  }
  if (!Array.isArray(scans) || scans.length === 0) {
    return res.status(400).json({ error: "scans must be a non-empty array", code: "invalid_input" });
  }
  if (scans.length > MAX_SYNC_BATCH_SIZE) {
    return res.status(400).json({
      error: `Batch too large — split into batches of ${MAX_SYNC_BATCH_SIZE} or fewer`,
      code: "batch_too_large",
    });
  }

  const authorized = await isAuthorizedTicketStaff(supabase, userId, event_id);
  if (!authorized) {
    return res.status(403).json({ error: "Not authorized to scan tickets for this event", code: "forbidden" });
  }

  const results: Array<{ client_scan_id: string; result?: string; error?: string }> = [];

  for (const scan of scans) {
    const { qr_token, client_scan_id, device_id, gate, scanned_at } = scan ?? {};
    if (!qr_token || !client_scan_id) {
      results.push({ client_scan_id: client_scan_id ?? "unknown", error: "missing qr_token or client_scan_id" });
      continue;
    }

    try {
      const { data, error } = await supabase.rpc("check_in_ticket", {
        p_qr_token: qr_token,
        p_event_id: event_id,
        p_scanned_by: userId,
        p_client_scan_id: client_scan_id,
        p_device_id: device_id ?? null,
        p_gate: gate ?? null,
        p_offline: true,
        p_scanned_at: scanned_at ?? new Date().toISOString(),
      });
      if (error) {
        results.push({ client_scan_id, error: error.message });
      } else {
        results.push({ client_scan_id, result: (data as any)?.result });
      }
    } catch (err: any) {
      results.push({ client_scan_id, error: err?.message ?? "unknown error" });
    }
  }

  return res.status(200).json({ results });
}

// ---------------------------------------------------------------------
// GET /api/tickets/validate?token=&event_id=
// ---------------------------------------------------------------------
async function handleValidate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const token = typeof req.query.token === "string" ? req.query.token : "";
  const eventId = typeof req.query.event_id === "string" ? req.query.event_id : "";
  if (!token || !eventId) {
    return res.status(400).json({ error: "token and event_id are required", code: "invalid_input" });
  }

  const authorized = await isAuthorizedTicketStaff(supabase, userId, eventId);
  if (!authorized) return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("*, event_registrations(name, team_id)")
    .eq("qr_token", token)
    .maybeSingle();

  if (error || !ticket) return res.status(200).json({ result: "INVALID" });

  if (ticket.event_id !== eventId) return res.status(200).json({ result: "WRONG_EVENT", ticket });
  if (ticket.status === "CANCELLED") return res.status(200).json({ result: "CANCELLED", ticket });
  if (ticket.status === "USED") {
    return res.status(200).json({ result: "DUPLICATE", ticket, previous_check_in_at: ticket.checked_in_at });
  }

  return res.status(200).json({
    result: "VALID",
    ticket,
    participant_name: ticket.event_registrations?.name ?? "",
    team_name: ticket.event_registrations?.team_id ?? null,
  });
}

// ---------------------------------------------------------------------
// POST /api/tickets/cancel
// ---------------------------------------------------------------------
async function handleCancel(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const { ticket_id, reason } = req.body ?? {};
  if (!ticket_id) return res.status(400).json({ error: "ticket_id is required", code: "invalid_input" });

  const { data: ticket } = await supabase.from("tickets").select("event_id").eq("id", ticket_id).maybeSingle();
  if (!ticket) return res.status(404).json({ error: "Ticket not found", code: "not_found" });

  const authorized = await isAuthorizedTicketStaff(supabase, userId, ticket.event_id);
  if (!authorized) return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });

  const { data, error } = await supabase.rpc("cancel_ticket", {
    p_ticket_id: ticket_id,
    p_cancelled_by: userId,
    p_reason: reason ?? null,
  });

  if (error) return res.status(400).json({ error: error.message, code: "cancel_failed" });

  return res.status(200).json({ ticket: data });
}

// ---------------------------------------------------------------------
// POST /api/tickets/reissue
// ---------------------------------------------------------------------
async function handleReissue(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const { ticket_id } = req.body ?? {};
  if (!ticket_id) return res.status(400).json({ error: "ticket_id is required", code: "invalid_input" });

  const { data: ticket } = await supabase.from("tickets").select("event_id").eq("id", ticket_id).maybeSingle();
  if (!ticket) return res.status(404).json({ error: "Ticket not found", code: "not_found" });

  const authorized = await isAuthorizedTicketStaff(supabase, userId, ticket.event_id);
  if (!authorized) return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });

  const { data, error } = await supabase.rpc("reissue_ticket", {
    p_ticket_id: ticket_id,
    p_reissued_by: userId,
  });

  if (error) return res.status(400).json({ error: error.message, code: "reissue_failed" });

  return res.status(200).json({ ticket: data });
}

// ---------------------------------------------------------------------
// GET /api/tickets/search?event_id=&q=&status=
// ---------------------------------------------------------------------
async function handleSearch(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const eventId = typeof req.query.event_id === "string" ? req.query.event_id : "";
  const searchTerm = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  if (!eventId) return res.status(400).json({ error: "event_id is required", code: "invalid_input" });

  const authorized = await isAuthorizedTicketStaff(supabase, userId, eventId);
  if (!authorized) return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });

  let query = supabase
    .from("tickets")
    .select("*, events(title, start_at, location, image_url, format), event_registrations!inner(name, team_id)")
    .eq("event_id", eventId)
    .limit(searchTerm ? 500 : 50);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: "Search failed" });

  let tickets = (data ?? []).map((row: any) => ({
    id: row.id,
    event_id: row.event_id,
    registration_id: row.registration_id,
    ticket_code: row.ticket_code,
    qr_token: row.qr_token,
    status: row.status,
    ticket_type: row.ticket_type,
    gaming_meta: row.gaming_meta,
    checked_in_at: row.checked_in_at,
    created_at: row.created_at,
    event_title: row.events?.title ?? "",
    participant_name: row.event_registrations?.name ?? "",
    team_name: row.event_registrations?.team_id ?? null,
  }));

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    tickets = tickets
      .filter((t) => t.ticket_code.toLowerCase().includes(term) || t.participant_name?.toLowerCase().includes(term))
      .slice(0, 50);
  }

  return res.status(200).json({ tickets });
}

// ---------------------------------------------------------------------
// GET /api/tickets/stats?event_id=
// ---------------------------------------------------------------------
async function handleStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const eventId = typeof req.query.event_id === "string" ? req.query.event_id : "";
  if (!eventId) return res.status(400).json({ error: "event_id is required", code: "invalid_input" });

  const authorized = await isAuthorizedTicketStaff(supabase, userId, eventId);
  if (!authorized) return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });

  const { data, error } = await supabase.rpc("get_attendance_stats", { p_event_id: eventId });
  if (error) return res.status(500).json({ error: "Failed to load stats" });

  return res.status(200).json({ stats: data });
}

// ---------------------------------------------------------------------
// GET /api/tickets/manifest?event_id=
// ---------------------------------------------------------------------
async function handleManifest(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const eventId = typeof req.query.event_id === "string" ? req.query.event_id : "";
  if (!eventId) return res.status(400).json({ error: "event_id is required", code: "invalid_input" });

  const authorized = await isAuthorizedTicketStaff(supabase, userId, eventId);
  if (!authorized) return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });

  const { data: event } = await supabase.from("events").select("title, ticket_gates").eq("id", eventId).maybeSingle();

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("qr_token, ticket_code, status, ticket_type, gaming_meta, event_registrations(name, team_id)")
    .eq("event_id", eventId)
    .neq("status", "CANCELLED");

  if (error) return res.status(500).json({ error: "Failed to build manifest" });

  return res.status(200).json({
    manifest: {
      eventId,
      eventTitle: event?.title ?? "",
      generatedAt: new Date().toISOString(),
      gates: event?.ticket_gates ?? [],
      tickets: (tickets ?? []).map((t: any) => ({
        qrToken: t.qr_token,
        ticketCode: t.ticket_code,
        status: t.status,
        ticketType: t.ticket_type,
        participantName: t.event_registrations?.name ?? "",
        teamName: t.event_registrations?.team_id ?? null,
        gamingMeta: t.gaming_meta ?? null,
      })),
    },
  });
}

// ---------------------------------------------------------------------
// POST /api/tickets/enable
// ---------------------------------------------------------------------
async function handleEnable(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const { event_id, enabled, gates } = req.body ?? {};
  if (!event_id || typeof enabled !== "boolean") {
    return res.status(400).json({ error: "event_id and enabled are required", code: "invalid_input" });
  }

  const { data: event } = await supabase.from("events").select("id, created_by").eq("id", event_id).maybeSingle();
  if (!event) return res.status(404).json({ error: "Event not found", code: "not_found" });

  const isOwner = event.created_by === userId;
  if (!isOwner && !(await isGlobalAdmin(supabase, userId))) {
    return res.status(403).json({ error: "Only the event owner can change ticketing settings", code: "forbidden" });
  }

  const updatePayload: Record<string, unknown> = { ticketing_enabled: enabled };
  if (Array.isArray(gates)) {
    updatePayload.ticket_gates = gates.filter((g: unknown) => typeof g === "string" && g.trim());
  }

  const { error: updateError } = await supabase.from("events").update(updatePayload).eq("id", event_id);
  if (updateError) return res.status(500).json({ error: "Failed to update event" });

  let backfilledCount = 0;
  if (enabled) {
    const { data: registrations } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", event_id)
      .in("status", ["confirmed", "registered"]);

    for (const registration of registrations ?? []) {
      const { error: genError } = await supabase.rpc("generate_ticket_for_registration", {
        p_registration_id: registration.id,
      });
      if (!genError) backfilledCount += 1;
    }
  }

  return res.status(200).json({ event_id, ticketing_enabled: enabled, backfilled_count: backfilledCount });
}

// ---------------------------------------------------------------------
// POST/DELETE /api/tickets/staff
// ---------------------------------------------------------------------
async function handleStaff(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = await requireAuth(req.headers as any);
  if (!userId) return res.status(401).json({ error: "Missing or invalid authorization" });

  const { event_id, user_id, role } = req.body ?? {};
  if (!event_id || !user_id) {
    return res.status(400).json({ error: "event_id and user_id are required", code: "invalid_input" });
  }

  const { data: event } = await supabase.from("events").select("created_by").eq("id", event_id).maybeSingle();
  if (!event) return res.status(404).json({ error: "Event not found", code: "not_found" });

  const isOwner = event.created_by === userId;
  if (!isOwner && !(await isGlobalAdmin(supabase, userId))) {
    return res.status(403).json({ error: "Only the event owner can manage scanner staff", code: "forbidden" });
  }

  if (req.method === "DELETE") {
    const { error } = await supabase.from("event_staff").delete().eq("event_id", event_id).eq("user_id", user_id);
    if (error) return res.status(500).json({ error: "Failed to revoke access" });
    return res.status(200).json({ revoked: true });
  }

  const grantRole = ["organizer", "volunteer", "staff"].includes(role) ? role : "volunteer";
  const { data, error } = await supabase
    .from("event_staff")
    .upsert({ event_id, user_id, role: grantRole, granted_by: userId }, { onConflict: "event_id,user_id" })
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to grant access" });

  return res.status(200).json({ grant: data });
}

// ---------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------
const HANDLERS: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>> = {
  get: handleGet,
  my: handleMy,
  generate: handleGenerate,
  checkin: handleCheckin,
  sync: handleSync,
  validate: handleValidate,
  cancel: handleCancel,
  reissue: handleReissue,
  search: handleSearch,
  stats: handleStats,
  manifest: handleManifest,
  enable: handleEnable,
  staff: handleStaff,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === "string" ? req.query.action : "";
  const fn = HANDLERS[action];

  if (!fn) {
    return res.status(404).json({ error: `Unknown ticket action: ${action}`, code: "unknown_action" });
  }

  try {
    await fn(req, res);
  } catch (err: any) {
    console.error(`Ticket action "${action}" error:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
