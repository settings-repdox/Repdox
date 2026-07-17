import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared Supabase client for API routes using SERVICE_ROLE_KEY
 */
export const getSupabaseAdmin = (): SupabaseClient => {
  return createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

/**
 * Properly verify JWT token and extract user ID using Supabase Auth
 * This prevents JWT forgery by verifying the signature against Supabase
 */
export async function verifyAuth(token: string): Promise<string | null> {
  if (!token) return null;
  
  const supabase = getSupabaseAdmin();
  
  try {
    // auth.getUser(token) verifies the JWT signature and ensures it's valid
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.warn("Auth verification failed:", error?.message);
      return null;
    }
    
    return user.id;
  } catch (err) {
    console.error("Unexpected error during auth verification:", err);
    return null;
  }
}

/**
 * Extracts and verifies the bearer token from an incoming request's
 * Authorization header in one call. Returns the verified user id, or null
 * if the header is missing/malformed or the token doesn't verify — callers
 * should treat null as "respond 401", not distinguish the two cases (see
 * verifyAuth's own doc comment on why a failed verification isn't logged
 * with detail to the client).
 */
export async function requireAuth(
  headers: Record<string, string | string[] | undefined>,
): Promise<string | null> {
  const authHeader = headers.authorization;
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAuth(token);
}
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  const cloudflareIP = headers["cf-connecting-ip"];
  if (typeof cloudflareIP === "string") {
    return cloudflareIP;
  }
  return headers["x-real-ip"]?.toString() || "127.0.0.1";
}
