import { supabase } from "@/integrations/supabase/client";
import type { IUserService, UserProfileDTO } from "../interfaces/IUserService";
import type { UserDTO } from "../../../shared/dtos/user.dto";

export class UserServiceImpl implements IUserService {
  async getUserProfile(id: string): Promise<UserProfileDTO | null> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, date_of_birth, bio, avatar_url, job_title")
      .eq("user_id", id)
      .single();
    if (error || !data) return null;
    return {
      userId: data.user_id,
      fullName: data.full_name,
      dateOfBirth: data.date_of_birth,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      jobTitle: data.job_title,
    };
  }

  async getUser(id: string): Promise<UserDTO | null> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, avatar_url")
      .eq("user_id", id)
      .single();
    if (error || !data) return null;
    return {
      id: data.user_id,
      displayName: data.full_name || "",
      // user_profiles has no email column — email lives in auth.users,
      // which requires the service-role admin API (server-side only) to
      // look up by an arbitrary user id. Left undefined here rather than
      // guessed at; callers that need another user's email should go
      // through a server-side route (see api/tickets/_utils.ts's
      // isGlobalAdmin for the admin-API pattern).
      avatarUrl: data.avatar_url || undefined,
    };
  }

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

  async createVerification(
    userId: string,
    type: "email" | "phone",
    contact: string,
    ttlSeconds = 60 * 60,
  ) {
    try {
      const fnRes = await supabase.functions
        .invoke("send-verification", {
          body: JSON.stringify({ userId, type, contact, ttlSeconds }),
        })
        .catch(() => ({ error: true }));
      if (fnRes) {
        const fr = fnRes as unknown as { error?: unknown; data?: unknown };
        if (!fr.error && fr.data) {
          const parsed =
            typeof fr.data === "string" ? JSON.parse(fr.data) : fr.data;
          if (
            parsed &&
            typeof parsed === "object" &&
            "token" in (parsed as Record<string, unknown>)
          ) {
            const token = (parsed as Record<string, unknown>)["token"] as
              | string
              | undefined;
            const sent = !!(parsed as Record<string, unknown>)["sent"];
            if (token) return { token, sent, fromServer: true };
          }
        }
      }
    } catch (e) {
      // fallback
    }

    // Local fallback generation
    let token: string;
    if (type === "phone") {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      token = String(Math.floor(100000 + (array[0] / 4294967296) * 900000));
    } else {
      token =
        Math.random().toString(36).substring(2, 10) +
        Math.random().toString(36).substring(2, 10);
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { data, error } = await supabase
      .from("profile_verifications")
      .upsert(
        [
          {
            user_id: userId,
            type,
            contact,
            token,
            expires_at: expiresAt,
            verified: false,
          },
        ],
        { onConflict: "user_id, type" },
      )
      .select();

    if (error) throw error;
    const arr = data as Array<Record<string, unknown>> | null;
    const id = arr && arr[0] ? (arr[0]["id"] as string | undefined) : undefined;
    return {
      token,
      id,
      sent: false,
      fromServer: false,
    };
  }

  async verifyToken(userId: string, type: "email" | "phone", token: string) {
    const { data, error } = await supabase
      .from("profile_verifications")
      .select("id, expires_at, verified")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) return false;
    if (data.verified) return true;
    const expiresAt = new Date((data as any).expires_at).getTime();
    if (Date.now() > expiresAt) return false;
    const { error: uerr } = await supabase
      .from("profile_verifications")
      .update({ verified: true })
      .eq("id", (data as any).id);
    if (uerr) throw uerr;
    return true;
  }

  async deleteUserAccount(): Promise<boolean> {
    const userRes = await supabase.auth.getUser();
    const user = userRes?.data?.user ?? null;
    if (!user) throw new Error("Authentication required");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");
    const userId = user.id;
    try {
      const fn = await supabase.functions.invoke("delete-user-account", {
        body: { userId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if ((fn as any).error)
        throw new Error((fn as any).error.message || "Edge Function error");
    } catch (err) {
      throw err;
    }
    await supabase.auth.signOut();
    return true;
  }
}
