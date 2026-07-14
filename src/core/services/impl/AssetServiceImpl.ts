import { supabase } from "@/integrations/supabase/client";
import type { IAssetService } from "../interfaces/IAssetService";

export class AssetServiceImpl implements IAssetService {
  private avatarCache = new Map<string, string>();

  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (!file.type.startsWith("image/"))
      throw new Error("File must be an image");
    if (file.size > 5242880) throw new Error("File size must be less than 5MB");
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    try {
      // Cleanup
      const { data: existingFiles } = await supabase.storage
        .from("avatars")
        .list(userId)
        .catch(() => ({ data: [] as Array<{ name: string }> }));
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(
          (f: { name: string }) => `${userId}/${f.name}`,
        );
        await supabase.storage
          .from("avatars")
          .remove(filesToDelete)
          .catch(() => {});
      }

      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      return fileName;
    } catch (e) {
      console.error("[AssetService] uploadAvatar error", e);
      throw e;
    }
  }

  async getAvatarSignedUrl(path: string): Promise<string> {
    if (this.avatarCache.has(path)) return this.avatarCache.get(path)!;
    let cleanPath = path;
    if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
    if (cleanPath.startsWith("avatars/"))
      cleanPath = cleanPath.replace("avatars/", "");
    const { data } = supabase.storage.from("avatars").getPublicUrl(cleanPath);
    this.avatarCache.set(path, data.publicUrl);
    return data.publicUrl;
  }

  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn = 3600,
  ): Promise<string> {
    let cleanPath = path;
    if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
    if (cleanPath.startsWith(`${bucket}/`))
      cleanPath = cleanPath.replace(`${bucket}/`, "");
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }

  async uploadFile(
    file: File,
    bucket: string,
    userId: string,
  ): Promise<string> {
    if (!file.type.startsWith("image/"))
      throw new Error("Only image files are allowed");
    const maxSize = bucket === "avatars" ? 5242880 : 52428800;
    if (file.size > maxSize) throw new Error("File size too large");
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return fileName;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  }

  getPublicUrl(bucket: string, path: string): string {
    let cleanPath = path;
    if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
    if (cleanPath.startsWith(`${bucket}/`))
      cleanPath = cleanPath.replace(`${bucket}/`, "");
    const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
    return data.publicUrl;
  }
}
