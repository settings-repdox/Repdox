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

// Full profile record — the complete set of editable fields shown on the
// Profile page. Kept snake_case (matching the underlying user_profiles
// table) rather than remapped to camelCase like UserProfileDTO above,
// since Profile.tsx's rendering code already expects this shape
// end-to-end and remapping would mean rewriting ~1600 lines of field
// access for no behavioral gain.
export interface FullUserProfileDTO {
  id: string;
  user_id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  website: string | null;
  company: string | null;
  job_title: string | null;
  handle?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  portfolio_url?: string | null;
  date_of_birth?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertProfilePayload {
  id?: string | null;
  user_id: string;
  full_name?: string | null;
  handle?: string | null;
  bio?: string | null;
  job_title?: string | null;
  company?: string | null;
  website?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  portfolio_url?: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
}

export interface DiscordLinkRequestDTO {
  id: string;
  token: string;
  discordId: string;
  discordUsername: string;
  expiresAt: string;
}

export interface IUserService {
  getUser(id: string): Promise<UserDTO | null>;
  getCurrentUser(): Promise<UserDTO | null>;
  getUserProfile(id: string): Promise<UserProfileDTO | null>;
  getFullProfile(userId: string): Promise<FullUserProfileDTO | null>;
  upsertProfile(payload: UpsertProfilePayload): Promise<void>;
  isContactVerified(
    userId: string,
    type: "email" | "phone",
    contact: string,
  ): Promise<boolean>;
  signOut(): Promise<void>;
  getDiscordLinkRequest(token: string): Promise<DiscordLinkRequestDTO | null>;
  deleteDiscordLinkRequest(token: string): Promise<void>;
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
