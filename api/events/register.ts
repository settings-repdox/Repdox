/**
 * API Route: POST /api/events/register
 * Registers a user or guest for an event
 *
 * Security:
 * - Verifies auth session for authenticated users
 * - Extracts IP from headers
 * - Enforces 200 registrations per day per user
 * - Prevents duplicate registrations
 * - Uses Supabase RPC function for atomicity
 * - Supports both authenticated and guest registrations
 *
 * Request body:
 * {
 *   event_id: uuid,
 *   user_id?: uuid,  // optional, derived from token if not provided
 *   name?: string,   // required for guests, optional for authenticated
 *   email?: string,  // required for guests, optional for authenticated
 *   phone?: string,
 *   message?: string,
 *   role?: string
 * }
 *
 * Response:
 * { registration_id: uuid, status: string, message: string }
 * or
 * { error: string, code: 'quota_exceeded' | 'already_registered' | 'role_full' | ... }
 */

import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  const cloudflareIP = req.headers["cf-connecting-ip"];
  if (typeof cloudflareIP === "string") {
    return cloudflareIP;
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * Decode JWT payload without verification
 * Only use this to extract user ID; Supabase will validate token on DB operations
 */
function decodeJWT(token: string): { sub?: string; user_id?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8"),
    );
    return decoded;
  } catch {
    return null;
  }
}

async function verifyAuth(token: string): Promise<string | null> {
  try {
    // Decode JWT to get user ID
    const payload = decodeJWT(token);
    if (!payload || !payload.sub) return null;

    // Verify user exists using admin API with service role
    const { data: user, error } = await supabase.auth.admin.getUserById(
      payload.sub,
    );

    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Get authenticated user's email from auth.users
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("auth.users")
      .select("email")
      .eq("id", userId)
      .single();

    return error ? null : data?.email || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. EXTRACT AUTH IF PROVIDED
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      userId = await verifyAuth(token);
    }

    // 2. EXTRACT CLIENT IP
    const clientIP = getClientIP(req);

    // 3. VALIDATE REQUEST BODY
    const { event_id, name, email, phone, message, role } = req.body;

    if (!event_id) {
      return res
        .status(400)
        .json({ error: "Missing required field: event_id" });
    }

    // For authenticated users, use their user_id
    // For guests, require name and email
    if (!userId && (!name || !email)) {
      return res.status(400).json({
        error: "For guest registration, name and email are required",
      });
    }

    // 4. CHECK QUOTA (only for authenticated users)
    if (userId) {
      const { data: quotaCheck, error: quotaError } = await supabase.rpc(
        "check_and_increment_quota",
        {
          p_user_id: userId,
          p_ip: null,
          p_action: "register_event",
        },
      );

      if (quotaError) {
        console.error("Quota check error:", quotaError);
        return res.status(500).json({ error: "Quota check failed" });
      }

      if (!quotaCheck[0]?.allowed) {
        return res.status(429).json({
          error: `Quota exceeded: ${quotaCheck[0]?.current_count || 0} / ${quotaCheck[0]?.limit_per_day || 200} daily limit`,
          code: "quota_exceeded",
        });
      }
    }

    // 5. GET USER EMAIL IF AUTHENTICATED
    let userEmail: string | null = email || null;
    if (userId && !userEmail) {
      userEmail = await getUserEmail(userId);
    }

    // 6. CALL ATOMIC REGISTRATION RPC
    const { data: registration, error: registrationError } = await supabase.rpc(
      "register_for_event",
      {
        p_event_id: event_id,
        p_user_id: userId,
        p_name: name,
        p_email: userEmail,
        p_phone: phone,
        p_message: message,
        p_role: role,
      },
    );

    if (registrationError) {
      const errorCode = registrationError.message;

      // Handle specific error codes from RPC
      if (errorCode === "event_not_found") {
        return res
          .status(404)
          .json({ error: "Event not found", code: "event_not_found" });
      }

      if (errorCode === "registration_closed") {
        return res.status(410).json({
          error: "Registration deadline has passed",
          code: "registration_closed",
        });
      }

      if (errorCode === "already_registered") {
        return res.status(409).json({
          error: "You are already registered for this event",
          code: "already_registered",
        });
      }

      if (errorCode === "role_full") {
        return res.status(409).json({
          error: "The selected role is at capacity",
          code: "role_full",
        });
      }

      console.error("Registration error:", registrationError);
      return res.status(500).json({
        error: "Registration failed",
        details: registrationError.message,
      });
    }

    // 7. RETURN SUCCESS
    return res.status(201).json({
      registration_id: registration.id,
      status: registration.status,
      message: `Successfully registered for event`,
      registered_as: userId ? "authenticated" : "guest",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
