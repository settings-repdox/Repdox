// Map common event image paths (from seed or CMS) to local bundled assets.
// If your Supabase records use these filenames (e.g. "/images/hacksprint.jpg"),
// this helper returns the compiled import so Vite serves the image correctly.

import { supabase } from "@/integrations/supabase/client";
import eventHackathon from "@/assets/event-hackathon.jpg";
import eventWorkshop from "@/assets/event-workshop.jpg";
import eventGaming from "@/assets/event-gaming.jpg";

const filenameMap: Record<string, string> = {
  "hacksprint.jpg": eventHackathon,
  "hacksprint-2025.jpg": eventHackathon,
  "hackathon.jpg": eventHackathon,
  "workshop.jpg": eventWorkshop,
  "event-workshop.jpg": eventWorkshop,
  "gaming.jpg": eventGaming,
  "event-gaming.jpg": eventGaming,
};

import type { IAssetService } from "@/core/services/interfaces/IAssetService";
import { resolveService } from "@/core/services/di";

/**
 * Synchronous function to get event image URL
 * First checks local assets, then constructs Supabase URL
 */
export function getEventImage(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;

  // If it's already an absolute URL (http/https), just return it
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  // Extract filename and try to map to local assets first
  const parts = imageUrl.split("/");
  const filename = parts[parts.length - 1].toLowerCase();
  const mapped = filenameMap[filename];
  if (mapped) return mapped;

  // Clean the path for Supabase
  let cleanPath = imageUrl;

  // Remove leading slash
  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.substring(1);
  }

  // Remove 'event-images/' prefix if accidentally included
  if (cleanPath.startsWith("event-images/")) {
    cleanPath = cleanPath.replace("event-images/", "");
  }

  // Try AssetService first, fallback to Supabase public URL
  try {
    registerDefaults();
    const asset = resolveService<IAssetService>("AssetService");
    const pub = asset.getPublicUrl("event-images", cleanPath);
    if (pub) return pub;
  } catch (e) {
    // ignore and fallback to supabase
  }

  const { data } = supabase.storage
    .from("event-images")
    .getPublicUrl(cleanPath);
  return data.publicUrl;
}

/**
 * Async function to get event image URL with fallback to signed URLs
 * Use this when you need to handle private buckets
 */
export async function getEventImageUrl(
  imageUrl?: string | null,
): Promise<string | undefined> {
  if (!imageUrl) return undefined;

  // If it's already an absolute URL (http/https), just return it
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  // Extract filename and try to map to local assets first
  const parts = imageUrl.split("/");
  const filename = parts[parts.length - 1].toLowerCase();
  const mapped = filenameMap[filename];
  if (mapped) return mapped;

  // Clean the path for Supabase
  let cleanPath = imageUrl;

  // Remove leading slash
  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.substring(1);
  }

  // Remove 'event-images/' prefix if accidentally included
  if (cleanPath.startsWith("event-images/")) {
    cleanPath = cleanPath.replace("event-images/", "");
  }

  // Prefer AssetService if available
  try {
    registerDefaults();
    const asset = resolveService<IAssetService>("AssetService");
    const pub = asset.getPublicUrl("event-images", cleanPath);
    if (pub) return pub;
    const signed = await asset.createSignedUrl("event-images", cleanPath, 3600);
    return signed;
  } catch (error) {
    // Fallback to direct Supabase APIs
  }

  try {
    const { data: publicData } = supabase.storage
      .from("event-images")
      .getPublicUrl(cleanPath);
    if (publicData?.publicUrl) return publicData.publicUrl;

    const { data: signedData, error } = await supabase.storage
      .from("event-images")
      .createSignedUrl(cleanPath, 3600);
    if (error) {
      console.error("[getEventImageUrl] Error creating signed URL:", error);
      return undefined;
    }
    return signedData?.signedUrl;
  } catch (error) {
    console.error("[getEventImageUrl] Exception:", error);
    return undefined;
  }
}

/**
 * Helper to validate if an image URL is accessible
 * Useful for debugging
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}
