import { supabase } from "@/integrations/supabase/client";
import type { IVolunteerService } from "../interfaces/IVolunteerService";
import type {
  CreateVolunteerApplicationPayload,
  VolunteerApplicationDTO,
} from "../dtos/volunteer-application.dto";

function toDTO(row: {
  id: string;
  created_at: string;
  updated_at: string | null;
  full_name: string;
  email: string;
  phone: string;
  school: string | null;
  city: string | null;
  branch: string | null;
  class: string | null;
  role_preference: string;
  motivation: string;
  status: "pending" | "interview" | "approved" | "rejected";
  interview_time: string | null;
  meet_link: string | null;
}): VolunteerApplicationDTO {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    school: row.school,
    city: row.city,
    branch: row.branch,
    class: row.class,
    rolePreference: row.role_preference,
    motivation: row.motivation,
    status: row.status,
    interviewTime: row.interview_time,
    meetLink: row.meet_link,
  };
}

export class VolunteerServiceImpl implements IVolunteerService {
  async getApplicationByEmail(
    email: string,
  ): Promise<VolunteerApplicationDTO | null> {
    const { data, error } = await supabase
      .from("volunteer_applications")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error || !data) return null;
    return toDTO(data);
  }

  async createApplication(
    payload: CreateVolunteerApplicationPayload,
  ): Promise<VolunteerApplicationDTO> {
    const { data, error } = await supabase
      .from("volunteer_applications")
      .insert([
        {
          full_name: payload.fullName,
          email: payload.email,
          phone: payload.phone,
          school: payload.school ?? null,
          city: payload.city ?? null,
          branch: payload.branch ?? null,
          class: payload.class ?? null,
          role_preference: payload.rolePreference,
          motivation: payload.motivation,
          status: "pending",
        },
      ])
      .select()
      .single();
    if (error || !data) throw error || new Error("Application submission failed");
    return toDTO(data);
  }
}
