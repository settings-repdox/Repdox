// Centralized Event DTO (Phase 9: consolidated from domain layer)
import type { Json } from "@/integrations/supabase/types";

// Matches the real Postgres `event_type` enum exactly (see
// supabase/migrations for the enum definition, and
// src/integrations/supabase/types.ts's `event_type` Enums entry).
// Capitalized, and there is no "other" value in the database - a
// previous version of this type was `"gaming" | "hackathon" |
// "workshop" | "other"` (wrong case, plus a phantom "other" that
// never existed), and was never used as a type annotation anywhere
// in the codebase, so nothing depended on the wrong shape.
export type EventType = "Hackathon" | "Workshop" | "Gaming";

export type EventLifecycle =
  | "draft"
  | "published"
  | "registration_open"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface EventDTO {
  id: string;
  title: string;
  slug: string;
  // Deliberately Json, not EventType: `isGamingEvent()`
  // (src/domains/gaming/impl/GamingServiceImpl.ts) does a defensive,
  // case-insensitive substring match across category/type/slug/
  // title/tags rather than a strict `=== "Gaming"` comparison,
  // precisely because this field's real runtime values have not been
  // reliably guaranteed to match the enum casing above. Do not narrow
  // this to EventType without first confirming every write path only
  // ever writes exactly "Hackathon" | "Workshop" | "Gaming" - a raw
  // `event.type === "gaming"` (lowercase) comparison elsewhere in the
  // codebase caused a real, user-reported bug; see
  // docs/runbooks/incident-registration-form-wrong-fields.md.
  type: Json;
  format: Json;
  start_at: string;
  end_at: string;
  registration_start: string | null;
  registration_deadline: string;
  check_in_start: string | null;
  check_in_end: string | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  discord_invite: string | null;
  instagram_handle: string | null;
  registration_link: string | null;
  is_active: boolean | null;
  location: string;
  short_blurb: string;
  overview: string | null;
  long_description: string | null;
  rules: string | null;
  image_url: string | null;
  sponsors: Json | null;
  faqs: Json | null;
  prizes: Json | null;
  schedule: Json | null;
  tags: string[] | null;
  roles: Json | null;
  bracket_url?: string | null;
  bracket_link?: string | null;
  ticketing_enabled?: boolean;
  ticket_gates?: string[];
  cover_url?: string | null;
  coverImage?: string | null;
  game_name?: string | null;
  category?: string | null;
  status?: EventLifecycle;
  [key: string]: unknown;
}
