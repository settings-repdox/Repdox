import { supabase } from "@/integrations/supabase/client";
import type { IAuthService } from "../interfaces/IAuthService";
import type { UserDTO } from "../../../shared/dtos/user.dto";

export class AuthService implements IAuthService {
  async getCurrentUser(): Promise<UserDTO | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const metadata = user.user_metadata as unknown;
    let displayName = user.email || "";
    if (
      metadata &&
      typeof metadata === "object" &&
      "displayName" in (metadata as Record<string, unknown>)
    ) {
      const val = (metadata as Record<string, unknown>)["displayName"];
      if (typeof val === "string") displayName = val;
    }
    return {
      id: user.id,
      displayName,
      email: user.email,
    };
  }
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data;
  }
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}
