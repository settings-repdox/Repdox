/**
 * API Route: POST /api/events/create
 * Creates a new event with duplicate detection and quota enforcement
 *
 * Security:
 * - Verifies auth session (service role key used server-side)
 * - Extracts IP from headers
 * - Enforces 5 events per day per user
 * - Checks event similarity before creation
 * - Requires authentication
 *
 * Request body:
 * {
 *   title: string,
 *   description: string,
 *   location: string,
 *   city: string,
 *   start_at: ISO date,
 *   end_at: ISO date,
 *   registration_deadline?: ISO date,
 *   capacity?: number,
 *   roles?: array,
 *   short_blurb?: string
 * }
 *
 * Response:
 * { event_id: uuid, message: string }
 * or
 * { error: string, code: 'quota_exceeded' | 'duplicate_detected' | ... }
 */

import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with service role key (for server-side writes)
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
 * Extract IP address from request headers
 * Handles X-Forwarded-For, CF-Connecting-IP, and other proxies
 */
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
 * Verify JWT token and extract user ID
 */
async function verifyAuth(token: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Check for similar events and return assessment
 */
async function checkEventSimilarity(
  title: string,
  location: string,
  startAt: string,
  organizerId: string,
  action: "block" | "warn" = "warn",
): Promise<{
  hasDuplicates: boolean;
  assessment: string;
  similar?: any[];
}> {
  try {
    const { data: similarities, error } = await supabase.rpc(
      "detect_duplicate_events",
      {
        p_title: title,
        p_location: location,
        p_start_at: startAt,
        p_organizer_id: organizerId,
        p_exclude_event_id: null,
      },
    );

    if (error) {
      console.warn("Similarity check error:", error);
      return { hasDuplicates: false, assessment: "unknown" };
    }

    if (!similarities || similarities.length === 0) {
      return { hasDuplicates: false, assessment: "clear" };
    }

    const blockedItems = similarities.filter((s: any) =>
      s.final_assessment.includes("BLOCK"),
    );

    if (blockedItems.length > 0 && action === "block") {
      return {
        hasDuplicates: true,
        assessment: "duplicate_blocked",
        similar: similarities,
      };
    }

    if (similarities.some((s: any) => s.final_assessment.includes("WARN"))) {
      return {
        hasDuplicates: false,
        assessment: "potential_duplicate_warn",
        similar: similarities,
      };
    }

    return {
      hasDuplicates: false,
      assessment: "low_risk",
      similar: similarities,
    };
  } catch (err) {
    console.error("Similarity detection error:", err);
    return { hasDuplicates: false, assessment: "error" };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. EXTRACT AUTH TOKEN AND VERIFY SESSION
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization" });
    }

    const token = authHeader.slice(7); // Remove "Bearer "
    const userId = await verifyAuth(token);

    if (!userId) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 2. EXTRACT CLIENT IP
    const clientIP = getClientIP(req);

    // 3. VALIDATE REQUEST BODY
    const {
      title,
      description,
      location,
      city,
      start_at,
      end_at,
      registration_deadline,
      capacity,
      roles,
      short_blurb,
    } = req.body;

    if (!title || !location || !start_at || !end_at) {
      return res.status(400).json({
        error: "Missing required fields: title, location, start_at, end_at",
      });
    }

    // 4. CHECK QUOTA
    const { data: quotaCheck, error: quotaError } = await supabase.rpc(
      "check_and_increment_quota",
      {
        p_user_id: userId,
        p_ip: clientIP,
        p_action: "create_event",
      },
    );

    if (quotaError) {
      console.error("Quota check error:", quotaError);
      return res.status(500).json({ error: "Quota check failed" });
    }

    if (!quotaCheck[0]?.allowed) {
      return res.status(429).json({
        error: `Quota exceeded: ${quotaCheck[0]?.current_count || 0} / ${quotaCheck[0]?.limit_per_day || 5} daily limit`,
        code: "quota_exceeded",
      });
    }

    // 5. CHECK FOR DUPLICATE EVENTS
    const similarity = await checkEventSimilarity(
      title,
      location,
      start_at,
      userId,
      "block", // Set to "warn" to allow with warning instead
    );

    if (
      similarity.hasDuplicates &&
      similarity.assessment === "duplicate_blocked"
    ) {
      return res.status(409).json({
        error: "Event blocked: Too similar to existing event",
        code: "duplicate_detected",
        similar_event: similarity.similar?.[0],
      });
    }

    // 6. CREATE EVENT IN DATABASE
    const { data: event, error: createError } = await supabase
      .from("events")
      .insert({
        title,
        description,
        location,
        city,
        start_at,
        end_at,
        registration_deadline,
        capacity,
        roles: roles ? JSON.stringify(roles) : null,
        short_blurb,
        created_by: userId,
        slug: generateEventSlug(title),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Event creation error:", createError);

      // Check if it's a duplicate event error
      if (createError.message.includes("duplicate")) {
        return res.status(409).json({
          error: "Duplicate event detected",
          code: "duplicate_detected",
        });
      }

      return res.status(500).json({
        error: "Failed to create event",
        details: createError.message,
      });
    }

    // 7. LOG SIMILARITY CHECK IF THERE WAS A WARNING
    if (similarity.similar && similarity.similar.length > 0) {
      await supabase.from("event_similarity_checks").insert({
        checking_event_id: event.id,
        similar_event_id: similarity.similar[0].similar_event_id,
        title_similarity_score: similarity.similar[0].phase1_score,
        action: "warn",
        reason: similarity.similar[0].final_assessment,
      });
    }

    // 8. RETURN SUCCESS
    return res.status(201).json({
      event_id: event.id,
      message: "Event created successfully",
      warning:
        similarity.assessment === "potential_duplicate_warn"
          ? `Warning: Event similar to ${similarity.similar?.[0]?.similar_event_title}`
          : null,
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
 * Generate a URL-friendly slug from event title
 */
function generateEventSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .slice(0, 50) + // Limit length
    `-${Date.now()}`
  ); // Add timestamp for uniqueness
}
