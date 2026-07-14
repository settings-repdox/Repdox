// Shared domain types for the repository.

export type UserId = string;
export type EventId = string;
export type RegistrationId = string;

export interface UserProfile {
  id: UserId;
  displayName: string;
  email: string;
}

export interface EventSummary {
  id: EventId;
  title: string;
  startsAt: string;
  venue: string;
}
