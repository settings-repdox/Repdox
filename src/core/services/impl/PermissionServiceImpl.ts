import type { IPermissionService } from "../interfaces/IPermissionService";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = ["shlokram5mar@gmail.com", "amishgandhi316@gmail.com"];

export class PermissionServiceImpl implements IPermissionService {
  async isUserAdmin(userId?: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // No email-by-arbitrary-user-id lookup is possible client-side
    // (there's no "profiles" table with an email column, and looking
    // someone else's email up via auth.users requires the service-role
    // admin API — see api/tickets/_utils.ts's isGlobalAdmin for that
    // server-side equivalent). The only email this code can actually
    // verify is the current session's own — so if a userId was passed
    // and it isn't the current session's user, fail closed (not admin)
    // rather than silently always returning false from a broken query.
    if (userId && user?.id !== userId) return false;

    if (!user || !user.email) return false;
    return ADMIN_EMAILS.includes(user.email.toLowerCase());
  }

  async hasPermission(_userId: string, _permission: string): Promise<boolean> {
    // Placeholder: implement role/permission lookup in future phases
    return false;
  }
}
