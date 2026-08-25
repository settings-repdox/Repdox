import type { UserDTO } from "../../../shared/dtos/user.dto";

export interface VerificationResult {
  token: string;
  id?: string;
  sent: boolean;
  fromServer: boolean;
}

// Profile-completeness fields used by event-creation flows. Narrower and
// more specific than UserDTO on purpose — UserDTO is the cross-cutting
// shape used by auth/session code, and callers that need bio/job_title/
// date_of_birth (e.g. AddEvent.tsx's profile-completeness gate) should use
// this instead of growing UserDTO with fields most callers don't need.
export interface UserProfileDTO {
  userId: string;
  fullName: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
}

export interface IUserService {
  getUser(id: string): Promise<UserDTO | null>;
  getCurrentUser(): Promise<UserDTO | null>;
  getUserProfile(id: string): Promise<UserProfileDTO | null>;
  createVerification(
    userId: string,
    type: "email" | "phone",
    contact: string,
    ttlSeconds?: number,
  ): Promise<VerificationResult>;
  verifyToken(
    userId: string,
    type: "email" | "phone",
    token: string,
  ): Promise<boolean>;
  deleteUserAccount(): Promise<boolean>;
}
