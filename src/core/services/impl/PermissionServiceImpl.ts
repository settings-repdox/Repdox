import type { IPermissionService } from "../interfaces/IPermissionService";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = ["shlokram5mar@gmail.com", "amishgandhi316@gmail.com"];

export class PermissionServiceImpl implements IPermissionService {
  async isUserAdmin(userId?: string): Promise<boolean> {
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) return false;
      return ADMIN_EMAILS.includes(user.email.toLowerCase());
    }
    // If userId provided, try to load profile email
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
    if (error || !data) return false;
    const profile = data as { email?: string };
    if (!profile.email) return false;
    return ADMIN_EMAILS.includes(profile.email.toLowerCase());
  }

  async hasPermission(_userId: string, _permission: string): Promise<boolean> {
    // Placeholder: implement role/permission lookup in future phases
    return false;
  }
}
