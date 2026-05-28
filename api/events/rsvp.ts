/**
 * API Route: POST /api/events/rsvp
 * Handles RSVP responses for events
 *
 * Request body:
 * {
 *   event_id: uuid,
 *   response: 'attending' | 'not_attending' | 'maybe',
 *   email?: string,  // required for guests
 *   user_id?: uuid,  // optional, derived from token if not provided
 *   notes?: string
 * }
 *
 * Response:
 * { id: uuid, status: 'submitted', message: string }
 * or
 * { error: string, code: 'event_not_found' | 'rsvp_closed' | 'invalid_response' | ... }
 */

import { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyAuth, getClientIP } from "../_utils.ts";

const supabase = getSupabaseAdmin();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event_id, response, email, user_id: providedUserId, notes } = req.body;

    // Validate required fields
    if (!event_id) {
      return res.status(400).json({ error: "event_id is required" });
    }

    if (!response || !['attending', 'not_attending', 'maybe'].includes(response)) {
      return res.status(400).json({
        error: "response must be one of: 'attending', 'not_attending', 'maybe'",
        code: "invalid_response"
      });
    }

    // Get or verify user
    let userId: string | null = null;
    let userEmail: string | null = email?.trim() || null;

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      userId = await verifyAuth(token);
      if (!userId && providedUserId) {
        userId = providedUserId;
      }
    } else if (providedUserId) {
      userId = providedUserId;
    }

    // Get user email from auth if authenticated and not provided
    if (userId && !userEmail) {
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      userEmail = user?.email || null;
    }

    // For authenticated users, use their registered email
    if (userId && !userEmail) {
      return res.status(400).json({
        error: "Could not determine user email",
        code: "invalid_email"
      });
    }

    // For guest users, email is required
    if (!userId && !userEmail) {
      return res.status(400).json({
        error: "email is required for guest RSVP",
        code: "missing_email"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (userEmail && !emailRegex.test(userEmail)) {
      return res.status(400).json({
        error: "Invalid email format",
        code: "invalid_email"
      });
    }

    // 1. CHECK IF EVENT EXISTS AND GET RSVP SETTINGS
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, rsvp_enabled, rsvp_type, rsvp_start_date, rsvp_end_date, title")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        error: "Event not found",
        code: "event_not_found"
      });
    }

    // 2. CHECK IF RSVP IS ENABLED
    if (!event.rsvp_enabled) {
      return res.status(400).json({
        error: "RSVP is not enabled for this event",
        code: "rsvp_disabled"
      });
    }

    // 3. CHECK IF RSVP WINDOW IS OPEN
    const now = new Date();
    if (event.rsvp_start_date && new Date(event.rsvp_start_date) > now) {
      return res.status(400).json({
        error: "RSVP has not started yet",
        code: "rsvp_not_started"
      });
    }

    if (event.rsvp_end_date && new Date(event.rsvp_end_date) < now) {
      return res.status(400).json({
        error: "RSVP deadline has passed",
        code: "rsvp_closed"
      });
    }

    // 4. INSERT OR UPDATE RSVP RESPONSE
    const { data: rsvpResponse, error: rsvpError } = await supabase
      .from("event_rsvp_responses")
      .upsert(
        {
          event_id,
          user_id: userId || null,
          email: userEmail!,
          response,
          notes: notes?.trim() || null,
          responded_at: new Date().toISOString()
        },
        { onConflict: "event_id,email" }
      )
      .select()
      .single();

    if (rsvpError) {
      console.error("RSVP insertion error:", rsvpError);
      return res.status(500).json({
        error: "Failed to submit RSVP",
        code: "rsvp_submission_failed"
      });
    }

    // 5. LOG RSVP SUBMISSION (for analytics)
    const clientIP = getClientIP(req.headers);
    console.log(`RSVP submitted for event ${event.title}:`, {
      email: userEmail,
      response,
      rsvp_type: event.rsvp_type,
      timestamp: new Date().toISOString(),
      ip: clientIP
    });

    return res.status(200).json({
      id: rsvpResponse.id,
      status: "submitted",
      message: `RSVP submitted as ${response}`,
      event_title: event.title
    });
  } catch (error) {
    console.error("RSVP endpoint error:", error);
    return res.status(500).json({
      error: "Internal server error",
      code: "internal_error"
    });
  }
}
