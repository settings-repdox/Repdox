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
    return `event_reg_${event.slug.toLowerCase().replace(/-/g, "_")}`;
  }
  if (event.id) {
    return `event_reg_${event.id.replace(/-/g, "_")}`;
  }
  return "event_registrations";
}
