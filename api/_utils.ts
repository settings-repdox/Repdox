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
 * Extract IP address from request headers
 */
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
