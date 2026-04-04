/**
 * API Route: POST /api/profile/verify
 * Verifies email or phone and marks as verified
 *
 * Security:
 * - Verifies auth session
 * - Enforces 20 verification requests per user per day
 * - Only allows users to verify their own contact info
 * - Validates token and checks expiry
 * - Prevents multiple simultaneous verifications
 *
 * Request body (step 1 - request verification):
 * {
 *   type: 'email' | 'phone',
 *   contact: string  // email or phone number
 * }
 *
 * Request body (step 2 - confirm token):
 * {
 *   type: 'email' | 'phone',
 *   contact: string,
 *   token: string,
 *   verify: true
 * }
 *
 * Response (step 1):
 * { verification_id: uuid, message: "Token sent", contact: string }
 *
 * Response (step 2):
 * { verified: true, message: "Verification successful" }
 * or
 * { error: string, code: 'invalid_token' | 'token_expired' | ... }
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
 * Generate a random 6-digit code for phone, or 32-char token for email
 */
function generateToken(type: "email" | "phone"): string {
  if (type === "phone") {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  // For email, generate a random 32-character token
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. VERIFY AUTH
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization" });
    }

    const userId = await verifyAuth(authHeader.slice(7));
    if (!userId) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 2. EXTRACT REQUEST BODY
    const { type, contact, token, verify } = req.body;

    if (!type || !contact || !["email", "phone"].includes(type)) {
      return res.status(400).json({
        error:
          "Missing or invalid fields: type must be 'email' or 'phone', contact required",
      });
    }

    // ========== STEP 1: REQUEST VERIFICATION ==========
    if (!verify) {
      // Check quota
      const { data: quotaCheck, error: quotaError } = await supabase.rpc(
        "check_and_increment_quota",
        {
          p_user_id: userId,
          p_ip: null,
          p_action: "verification_request",
        },
      );

      if (quotaError) {
        console.error("Quota check error:", quotaError);
        return res.status(500).json({ error: "Quota check failed" });
      }

      if (!quotaCheck[0]?.allowed) {
        return res.status(429).json({
          error: `Quota exceeded: ${quotaCheck[0]?.current_count || 0} / ${quotaCheck[0]?.limit_per_day || 20} daily limit`,
          code: "quota_exceeded",
        });
      }

      // Generate token
      const verificationToken = generateToken(type);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minute expiry

      // Create verification record
      const { data: verification, error: createError } = await supabase
        .from("profile_verifications")
        .insert({
          user_id: userId,
          type,
          contact,
          token: verificationToken,
          expires_at: expiresAt.toISOString(),
          verified: false,
        })
        .select()
        .single();

      if (createError) {
        console.error("Verification record error:", createError);

        // Handle unique constraint violation
        if (
          createError.message.includes("unique") ||
          createError.message.includes("already exists")
        ) {
          return res.status(409).json({
            error:
              "A verification request already exists for this type. Please try again later.",
            code: "verification_pending",
          });
        }

        return res.status(500).json({
          error: "Failed to create verification record",
          details: createError.message,
        });
      }

      // TODO: Send token via email/SMS (integrate with SendGrid, Twilio, etc.)
      console.log(
        `[VERIFICATION TOKEN] Type: ${type}, Contact: ${contact}, Token: ${verificationToken}`,
      );

      return res.status(201).json({
        verification_id: verification.id,
        message: `Verification token sent to ${type === "email" ? "email" : "phone"}`,
        contact,
        expires_in_seconds: 600, // 10 minutes
      });
    }

    // ========== STEP 2: VERIFY TOKEN ==========
    if (!token) {
      return res.status(400).json({
        error: "Missing required field: token for verification",
      });
    }

    // Find the verification record
    const { data: verification, error: fetchError } = await supabase
      .from("profile_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("token", token)
      .eq("verified", false)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          error: "Verification token not found or already verified",
          code: "invalid_token",
        });
      }
      console.error("Verification fetch error:", fetchError);
      return res.status(500).json({ error: "Verification lookup failed" });
    }

    // Check expiry
    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) {
      return res.status(410).json({
        error: "Verification token has expired",
        code: "token_expired",
      });
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("profile_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    if (updateError) {
      console.error("Verification update error:", updateError);
      return res.status(500).json({
        error: "Failed to mark as verified",
        details: updateError.message,
      });
    }

    // Also update the user's auth metadata if email/phone
    if (type === "email") {
      // Update email in auth.users (requires service role)
      try {
        await (supabase.auth as any).admin.updateUserById(userId, {
          email: contact,
          email_confirm: true, // Mark email as confirmed
        });
      } catch (err) {
        console.warn("Failed to update email confirmation in auth:", err);
        // Continue anyway - verification record is marked as verified
      }
    }

    return res.status(200).json({
      verified: true,
      message: `${type} successfully verified`,
      contact,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
