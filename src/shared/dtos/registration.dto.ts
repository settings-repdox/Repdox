// DTOs for registrations (Phase 2 foundation)

export interface RegistrationDTO {
  id: string;
  eventId: string;
  userId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  status?: "pending" | "confirmed" | "cancelled" | "waitlist" | "registered";
  role?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  school?: string | null;
  year?: string | null;
  stream?: string | null;
  motivation?: string | null;
  github?: string | null;
  linkedin?: string | null;
  participationMode?: string | null;
  expectedMembers?: number | null;
  editCount?: number | null;
  message?: string | null;
}
