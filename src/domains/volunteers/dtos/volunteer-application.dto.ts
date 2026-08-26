export type VolunteerApplicationStatus =
  | "pending"
  | "interview"
  | "approved"
  | "rejected";

export interface VolunteerApplicationDTO {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  fullName: string;
  email: string;
  phone: string;
  school: string | null;
  city: string | null;
  branch: string | null;
  class: string | null;
  rolePreference: string;
  motivation: string;
  status: VolunteerApplicationStatus;
  interviewTime: string | null;
  meetLink: string | null;
}

export interface CreateVolunteerApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  school?: string | null;
  city?: string | null;
  branch?: string | null;
  class?: string | null;
  rolePreference: string;
  motivation: string;
}
