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

/**
 * The four effective access levels for ticketing on a given event, in
 * ascending order of privilege. "owner" covers both the event's actual
 * creator and global admins — they're always full-access and never
 * depend on an event_staff row, so they're collapsed into one level here
 * rather than tracked separately.
 */
export type TicketAccessRole = "volunteer" | "staff" | "organizer" | "owner";

const ROLE_RANK: Record<TicketAccessRole, number> = {
  volunteer: 1,
  staff: 2,
  organizer: 3,
  owner: 4,
};

/**
 * Resolves the caller's effective access level for an event's ticketing,
 * or null if they have none at all. This is the single source of truth
 * for "how much can this person do" — every route below should call
 * hasTicketAccess() rather than re-deriving owner/admin/event_staff checks
 * itself, so the three access tiers stay consistent across every action.
 *
 * Previously, every action (scan a ticket, cancel a ticket, change
 * ticketing settings, grant someone else scanner access) used the same
 * flat "is this person owner, admin, or in event_staff at all" boolean —
 * meaning a volunteer granted access purely to check people in at the
 * door could also cancel/reissue tickets, view the admin dashboard, and
 * even grant or revoke other people's staff access. The event_staff.role
 * column existed from day one but nothing ever actually read it. This is
 * the fix — see hasTicketAccess()'s callers for which minimum role each
 * action now requires.
 */
export async function getTicketAccessRole(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<TicketAccessRole | null> {
  if (!userId || !eventId) return null;

  if (await isGlobalAdmin(supabase, userId)) return "owner";

  const { data: event } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .maybeSingle();
  if (event?.created_by === userId) return "owner";

  const { data: staffRow } = await supabase
    .from("event_staff")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!staffRow) return null;

  // event_staff.role is "organizer" | "volunteer" | "staff" (see the
  // schema migration) — a value outside that set is unexpected, but fail
  // safe to the lowest privilege level rather than granting more than the
  // grantor could have possibly intended.
  const role = staffRow.role as string;
  if (role === "organizer" || role === "staff" || role === "volunteer") {
    return role;
  }
  return "volunteer";
}

/**
 * True if the caller's effective role meets or exceeds minRole. This is
 * what every ticketing route should call — see the role-per-action table
 * in docs/api/README.md for what each action requires.
 */
export async function hasTicketAccess(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  minRole: TicketAccessRole,
): Promise<boolean> {
  const role = await getTicketAccessRole(supabase, userId, eventId);
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

/**
 * @deprecated Use hasTicketAccess(supabase, userId, eventId, minRole)
 * instead, with an explicit minimum role per action. This is kept only
 * because it's a convenient equivalent to
 * `hasTicketAccess(..., "volunteer")` (the lowest tier, i.e. "has ANY
 * ticketing access at all") for the couple of read-only actions where
 * that's genuinely the right check (e.g. downloading the offline
 * manifest) — don't reach for this as a default the way the old flat
 * check was used for every action.
 */
export async function isAuthorizedTicketStaff(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<boolean> {
  return hasTicketAccess(supabase, userId, eventId, "volunteer");
}
