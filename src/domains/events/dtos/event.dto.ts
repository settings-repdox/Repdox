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
  description?: string;
  type: EventType;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: EventLifecycle;
  coverImage?: string | null;
  createdBy?: string | null;
  [key: string]: unknown;
}
