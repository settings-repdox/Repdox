// profileService.ts - For PRIVATE buckets with authentication

import { resolveService } from "@/core/services/di";
import type { IAssetService } from "@/core/services/interfaces/IAssetService";
import type { IUserService } from "@/core/services/interfaces/IUserService";
import { supabase } from "@/integrations/supabase/client";

const assetService = () => resolveService<IAssetService>("AssetService");
const userService = () => resolveService<IUserService>("UserService");

// Memory cache for avatar URLs to avoid redundant fetches
const avatarCache = new Map<string, string>();

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  return assetService().uploadAvatar(userId, file);
}

/**
 * Get avatar URL for PRIVATE bucket
 * For private buckets, getPublicUrl still works because:
 * 1. Supabase client includes auth token automatically
 * 2. RLS policies control access, not the public/private setting
 * 3. The URL is "public" in format but access is controlled by RLS
 *
 * @param path - The storage path of the avatar
 * @returns The URL to access the avatar
 */
export async function getAvatarSignedUrl(path: string): Promise<string> {
  if (avatarCache.has(path)) return avatarCache.get(path)!;
  const url = await assetService().getAvatarSignedUrl(path);
  avatarCache.set(path, url);
  return url;
}

/**
 * Alternative: Create a time-limited signed URL (for sharing)
 * Use this if you need to share avatars with non-authenticated users
 * @param path - The storage path
 * @param expiresIn - Seconds until the URL expires (default: 1 hour)
 * @returns The signed URL
 */
export async function getAvatarSignedUrlTemporary(
  path: string,
  expiresIn: number = 3600,
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("[getAvatarSignedUrlTemporary] Error:", error);
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error("No signed URL returned");
    }

    return data.signedUrl;
  } catch (error) {
    console.error("[getAvatarSignedUrlTemporary] Exception:", error);
    throw error;
  }
}

/**
 * Delete an avatar from storage
 */
export async function deleteAvatar(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from("avatars").remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error("[deleteAvatar] Error:", error);
    throw error;
  }
}

/**
 * Upload community post image to PRIVATE bucket
 */
export async function uploadCommunityPostImage(
  userId: string,
  file: File,
): Promise<string> {
  try {
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    if (file.size > 52428800) {
      throw new Error("File size must be less than 50MB");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("community-posts")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    // Return the authenticated URL
    const { data } = supabase.storage
      .from("community-posts")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("[uploadCommunityPostImage] Error:", error);
    throw error;
  }
}

/**
 * Upload event image to PRIVATE bucket
 */
export async function uploadEventImage(
  userId: string,
  file: File,
): Promise<string> {
  // Delegate to core AssetService
  const asset = assetService();
  const path = await asset.uploadFile(file, "event-images", userId);
  return asset.getPublicUrl("event-images", path);
}

/**
 * Complete account deletion - calls Edge Function to delete auth user and all data
 */
export async function deleteUserAccount() {
  const svc = userService();
  return svc.deleteUserAccount();
}

// --------------------------
// Profile confirmation helpers
// --------------------------

/**
 * Creates a verification token row for a user (email or phone). This is a helper stub
 * that stores the token server-side; you should integrate your email/SMS provider
 * to actually send the token to the user in production.
 */
export async function createVerification(
  userId: string,
  type: "email" | "phone",
  contact: string,
  ttlSeconds = 60 * 60,
) {
  const svc = userService();
  return svc.createVerification(userId, type, contact, ttlSeconds);
}

export async function verifyToken(
  userId: string,
  type: "email" | "phone",
  token: string,
) {
  const svc = userService();
  return svc.verifyToken(userId, type, token);
}

// Local helpers removed in favor of @/lib/utils

/**
 * Helper: Get URL for any storage file in private bucket
 * Works because Supabase client includes auth token
 */
export function getPrivateStorageUrl(bucket: string, path: string): string {
  const asset = assetService();
  return asset.getPublicUrl(bucket, path);
}
