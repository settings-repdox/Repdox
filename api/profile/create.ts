/**
 * API Route: POST /api/profile/create
 * Creates or updates a user profile
 *
 * Security:
 * - Verifies auth session
 * - Only allows users to create/update their own profile
 * - Uses service role key for writes
 * - Enforces unique handle constraint
 *
 * Request body:
 * {
 *   full_name?: string,
 *   handle?: string,
 *   bio?: string,
 *   avatar_url?: string,
 *   phone?: string,
 *   website?: string,
 *   company?: string,
 *   job_title?: string,
 *   date_of_birth?: date,
 *   linkedin_url?: string,
 *   github_url?: string,
 *   twitter_url?: string,
 *   instagram_url?: string,
 *   portfolio_url?: string
 * }
 *
 * Response:
 * { user_id: uuid, message: string }
 * or
 * { error: string, code: 'handle_taken' | 'unauthorized' | ... }
 */

import { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyAuth } from "../_utils.ts";

const supabase = getSupabaseAdmin();

/**
 * Check if handle is available
 */
async function isHandleAvailable(
  handle: string,
  excludeUserId?: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("handle", handle)
    .neq("user_id", excludeUserId || "")
    .single();

  return error?.code === "PGRST116"; // Not found = available
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

    // 2. VALIDATE REQUEST BODY
    const {
      full_name,
      handle,
      bio,
      avatar_url,
      phone,
      website,
      company,
      job_title,
      date_of_birth,
      linkedin_url,
      github_url,
      twitter_url,
      instagram_url,
      portfolio_url,
    } = req.body;

    // 3. CHECK IF HANDLE IS AVAILABLE
    if (handle) {
      const available = await isHandleAvailable(handle, userId);
      if (!available) {
        return res.status(409).json({
          error: "Handle is already taken",
          code: "handle_taken",
        });
      }
    }

    // 4. UPSERT PROFILE
    const { data: profile, error: upsertError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          full_name,
          handle,
          bio,
          avatar_url,
          phone,
          website,
          company,
          job_title,
          date_of_birth,
          linkedin_url,
          github_url,
          twitter_url,
          instagram_url,
          portfolio_url,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Profile upsert error:", upsertError);

      // Handle unique constraint violations
      if (
        upsertError.message.includes("unique") ||
        upsertError.message.includes("already exists")
      ) {
        return res.status(409).json({
          error: "Handle or profile data is not unique",
          code: "constraint_violation",
        });
      }

      return res.status(500).json({
        error: "Failed to create/update profile",
        details: upsertError.message,
      });
    }

    // 5. RETURN SUCCESS
    return res.status(200).json({
      user_id: profile.user_id,
      message: "Profile created/updated successfully",
      handle: profile.handle,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
