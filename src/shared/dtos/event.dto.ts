// Centralized Event DTO (Phase 9: consolidated from domain layer)
import type { Json } from "@/integrations/supabase/types";

export type EventType = "gaming" | "hackathon" | "workshop" | "other";

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
  cover_url?: string | null;
  coverImage?: string | null;
  game_name?: string | null;
  category?: string | null;
  status?: EventLifecycle;
  [key: string]: unknown;
}
