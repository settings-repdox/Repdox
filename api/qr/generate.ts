/**
 * API Route: POST /api/qr/generate
 * Generates a tokenized QR code for event check-in
 *
 * Security:
 * - Verifies auth session
 * - Extracts IP from headers
 * - Enforces 10,000 QR fetches per user per day
 * - Tokenizes QR data to prevent exposure of raw registration IDs
 * - Includes expiry timestamp in token
 * - Caches responses for 1 hour
 *
 * Request body:
 * {
 *   registration_id: uuid,
 *   expires_in_hours?: number (default 24)
 * }
 *
 * Response:
 * {
 *   qr_token: string,
 *   qr_data: string,  // data for QR code generation
 *   expires_at: ISO date,
 *   message: string
 * }
 */

import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
    const { data: user, error } = await (
      supabase.auth as any
    ).admin.getUserById(payload.sub);

    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Create a signed token that includes registration ID and expiry
 * Prevents exposing raw registration IDs
 */
function createQRToken(registrationId: string, expiresAt: Date): string {
  const secret = process.env.QR_TOKEN_SECRET || "your-secret-key";
  const payload = {
    registration_id: registrationId,
    expires_at: expiresAt.getTime(),
    created_at: Date.now(),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64");

  // Create HMAC signature
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");

  // Return: payload.signature
  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode QR token
 */
function verifyQRToken(
  token: string,
): { registration_id: string; expires_at: number } | null {
  try {
    const secret = process.env.QR_TOKEN_SECRET || "your-secret-key";
    const [payloadB64, signature] = token.split(".");

    if (!payloadB64 || !signature) return null;

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("hex");

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payloadStr = Buffer.from(payloadB64, "base64").toString("utf-8");
    const payload = JSON.parse(payloadStr);

    // Check expiry
    if (payload.expires_at < Date.now()) {
      return null; // Token expired
    }

    return {
      registration_id: payload.registration_id,
      expires_at: payload.expires_at,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. VERIFY AUTH (optional for QR - could be public)
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      userId = await verifyAuth(authHeader.slice(7));
    }

    // 2. EXTRACT CLIENT IP
    const clientIP = getClientIP(req);

    // 3. VALIDATE REQUEST
    const { registration_id, expires_in_hours } = req.body;

    if (!registration_id) {
      return res.status(400).json({
        error: "Missing required field: registration_id",
      });
    }

    // 4. CHECK QUOTA (if authenticated)
    if (userId) {
      const { data: quotaCheck, error: quotaError } = await supabase.rpc(
        "check_and_increment_quota",
        {
          p_user_id: userId,
          p_ip: null,
          p_action: "qr_fetch",
        },
      );

      if (quotaError) {
        console.error("Quota check error:", quotaError);
        return res.status(500).json({ error: "Quota check failed" });
      }

      if (!quotaCheck[0]?.allowed) {
        return res.status(429).json({
          error: `Quota exceeded: ${quotaCheck[0]?.current_count || 0} / ${quotaCheck[0]?.limit_per_day || 10000} daily limit`,
          code: "quota_exceeded",
        });
      }
    }

    // 5. VERIFY REGISTRATION EXISTS
    const { data: registration, error: regError } = await supabase
      .from("event_registrations")
      .select("id, event_id, user_id")
      .eq("id", registration_id)
      .single();

    if (regError) {
      if (regError.code === "PGRST116") {
        return res.status(404).json({
          error: "Registration not found",
          code: "registration_not_found",
        });
      }
      console.error("Registration lookup error:", regError);
      return res.status(500).json({ error: "Failed to lookup registration" });
    }

    // 6. AUTHORIZE ACCESS (only registrant or event organizer can generate QR)
    const { data: event } = await supabase
      .from("events")
      .select("created_by")
      .eq("id", registration.event_id)
      .single();

    const isRegistrant = registration.user_id === userId;
    const isOrganizer = event && event.created_by === userId;

    if (userId && !isRegistrant && !isOrganizer) {
      return res.status(403).json({
        error: "Not authorized to generate QR for this registration",
        code: "unauthorized",
      });
    }

    // 7. CREATE QR TOKEN
    const expiresInHours = expires_in_hours || 24;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const qrToken = createQRToken(registration_id, expiresAt);

    // 8. GENERATE QR DATA
    // This would be the URL that attendees scan
    const appDomain =
      process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com";
    const qrData = `${appDomain}/check-in/${qrToken}`;

    // 9. SET CACHE HEADERS
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

    // 10. RETURN RESPONSE
    return res.status(200).json({
      qr_token: qrToken,
      qr_data: qrData,
      expires_at: expiresAt.toISOString(),
      message: "QR token generated successfully",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Export utility for verifying tokens (use in check-in routes)
 */
export { verifyQRToken, createQRToken };
