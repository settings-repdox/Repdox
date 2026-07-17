/**
 * Shared helpers for api/tickets/*.ts routes.
 *
 * These run in the Vercel serverless (Node) runtime, which is a separate
 * bundle from the browser app — they can't import
 * src/core/services/di.ts's browser-side DI registry or
 * src/domains/tickets/impl/TicketServiceImpl.ts (which depends on
 * @/integrations/supabase/client, the browser client). Authorization logic
 * is intentionally re-expressed here against the admin client instead of
 * imported, the same way src/core/services/impl/PermissionServiceImpl.ts's
 * ADMIN_EMAILS check isn't shared with any server-side code either — see
 * docs/api/README.md and docs/architecture/PHASE11_COMPLIANCE_REPORT.md
 * for the broader pattern (and its downside: two places to keep in sync)
 * this follows.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// Mirrors src/core/services/impl/PermissionServiceImpl.ts. If you change
// one, change the other — see file header above.
const ADMIN_EMAILS = ["shlokram5mar@gmail.com", "amishgandhi316@gmail.com"];

export async function isGlobalAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.admin.getUserById(userId);
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export async function isAuthorizedTicketStaff(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<boolean> {
  if (!userId || !eventId) return false;

  if (await isGlobalAdmin(supabase, userId)) return true;

  const { data: event } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .maybeSingle();
  if (event?.created_by === userId) return true;

  const { data: staffRow } = await supabase
    .from("event_staff")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!staffRow;
}
