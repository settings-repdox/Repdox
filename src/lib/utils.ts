import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export function generateRandomString(len = 32, dictionary = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
  let out = "";
  for (let i = 0; i < len; i++)
    out += dictionary[Math.floor(Math.random() * dictionary.length)];
  return out;
}

export function getRegistrationTableName(event: { slug?: string | null, id?: string | null }) {
  if (event.slug) {
    let formattedSlug = event.slug.toLowerCase().replace(/-/g, "_");
    // Prevent 404 errors by mapping the 2026 slug to the actual database table name
    if (formattedSlug === "solveforindia2026") {
      formattedSlug = "solveforindia";
    }
    return `event_reg_${formattedSlug}`;
  }
  if (event.id) {
    return `event_reg_${event.id.replace(/-/g, "_")}`;
  }
  return "event_registrations";
}
