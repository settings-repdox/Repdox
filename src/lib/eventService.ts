import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { User } from "@supabase/supabase-js";
import { slugify, generateRandomString } from "@/lib/utils";
import { deleteFile } from "@/lib/storageService"; // ADDED: Import deleteFile

type UploadedFile = { file: File; name: string };
type FAQ = { question: string; answer: string };

export interface CreateEventPayload {
  form: {
    title: string;
    slug?: string;
    type?: string | string[];
    format?: string | string[];
    start_date: string;
    start_time: string;
    end_date?: string;
    end_time?: string;
    registration_start_date?: string;
    registration_start_time?: string;
    registration_deadline_date?: string;
    registration_deadline_time?: string;
    location: string;
    short_blurb?: string;
    long_description?: string;
    overview?: string;
    rules?: string;
    registration_link?: string;
    discord_invite?: string;
    instagram_handle?: string;
  };
  tags?: string[];
  scheduleText?: string;
  teamsText?: string;
  prizeText?: string;
  faqs?: FAQ[];
  uploadedFiles?: UploadedFile[];
  roles?: Array<{ name: string; capacity?: number | null }>;
}

/**
 * Create event and related records (schedules, teams).
 */
export async function createEvent(payload: CreateEventPayload) {
  const {
    form,
    tags,
    scheduleText,
    teamsText,
    prizeText,
    faqs,
    uploadedFiles,
    roles,
  } = payload;

  if (!form?.title) throw new Error("Title is required");
  if (!form?.start_date || !form?.start_time)
    throw new Error("Start date and time are required");
  if (!form?.location) throw new Error("Location is required");

  const userRes = await supabase.auth.getUser();
  const user = (userRes?.data?.user ?? null) as User | null;
  if (!user || !user.id) {
    throw new Error("Authentication required to create events");
  }

  const startAt = new Date(`${form.start_date}T${form.start_time}`);
  const endAt =
    form.end_date && form.end_time
      ? new Date(`${form.end_date}T${form.end_time}`)
      : new Date(startAt.getTime() + 8 * 60 * 60 * 1000);
  const registrationStart =
    form.registration_start_date && form.registration_start_time
      ? new Date(
          `${form.registration_start_date}T${form.registration_start_time}`,
        )
      : null;
  const registrationDeadline =
    form.registration_deadline_date && form.registration_deadline_time
      ? new Date(
          `${form.registration_deadline_date}T${form.registration_deadline_time}`,
        )
      : new Date(startAt.getTime() - 24 * 60 * 60 * 1000);

  const baseEvent: Record<string, unknown> = {
    title: form.title,
    // store type/format as null when empty array to avoid DB type errors
    type: Array.isArray(form.type)
      ? form.type.length
        ? form.type
        : null
      : form.type || null,
    format: Array.isArray(form.format)
      ? form.format.length
        ? form.format
        : null
      : form.format || null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    registration_start: registrationStart
      ? registrationStart.toISOString()
      : null,
    registration_deadline: registrationDeadline.toISOString(),
    location: form.location,
    short_blurb: form.short_blurb ?? "",
    long_description: form.long_description ?? null,
    overview: form.overview ?? null,
    rules: form.rules ?? null,
    prizes: prizeText
      ? prizeText
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean)
      : null,
    faqs:
      faqs && faqs.length
        ? faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : null,
    registration_link: form.registration_link ?? null,
    discord_invite: form.discord_invite ?? null,
    instagram_handle: form.instagram_handle ?? null,
    tags: tags && tags.length ? tags : null,
    image_url: null,
    created_by: user.id,
    is_active: false, // ALL new events require admin approval
  };

  if (uploadedFiles && uploadedFiles.length > 0) {
    try {
      const file = uploadedFiles[0].file;

      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB");
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      let base =
        form.slug && form.slug.trim() !== ""
          ? form.slug
          : slugify(form.title || "event");
      base = base.replace(/[^a-z0-9-]/g, "");
      if (!base || base === "-") {
        base = "event";
      }
      const fileName = `${base}-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("[eventService] Upload error:", uploadError);
        console.warn(
          "Supabase upload error (continuing without image):",
          uploadError.message,
        );
      } else {
        baseEvent.image_url = fileName;
      }
    } catch (err) {
      console.error("[eventService] Upload exception:", err);
      console.warn(
        "Failed to upload event image, continuing without image",
        err,
      );
    }
  }

  const maxAttempts = 5;
  let createdEvent: Database["public"]["Tables"]["events"]["Row"] | null = null;
  const requestedSlug =
    form.slug && form.slug.trim() !== ""
      ? form.slug.trim()
      : slugify(form.title || "");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateSlug =
      attempt === 0
        ? requestedSlug
        : `${requestedSlug}-${generateRandomString(4, "abcdefghijklmnopqrstuvwxyz0123456789")}`;

    const eventPayload = {
      ...baseEvent,
      slug: candidateSlug,
    } as unknown as Database["public"]["Tables"]["events"]["Insert"];

    const { data, error } = await supabase
      .from("events")
      .insert(eventPayload)
      .select("*")
      .single();

    if (!error && data) {
      createdEvent = data as Database["public"]["Tables"]["events"]["Row"];
      break;
    }

    const errorObj = error as unknown as { message?: string; code?: string };
    const message = String(errorObj?.message ?? "");
    const code = String(errorObj?.code ?? "");

    const isUniqueViolation =
      code === "23505" ||
      message.toLowerCase().includes("duplicate") ||
      message.toLowerCase().includes("unique");

    if (!isUniqueViolation) {
      console.error("[eventService] Non-unique error:", error);
      throw new Error(`Failed to create event: ${message}`);
    }

    if (attempt === maxAttempts - 1) {
      throw new Error(
        `Failed to create event after ${maxAttempts} attempts. Please try a different title or slug.`,
      );
    }
  }

  if (!createdEvent) {
    throw new Error("Failed to create event: Unknown error");
  }

  const eventId = createdEvent.id as string;

  if (scheduleText && scheduleText.trim()) {
    const lines = scheduleText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const scheduleInserts = lines
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        const start = parts[0] || null;
        const title = parts[1] || null;
        const description = parts[2] || null;

        let isoStart = null;
        if (start) {
          try {
            const d = new Date(start);
            if (!isNaN(d.getTime())) {
              isoStart = d.toISOString();
            }
          } catch (e) {
            console.warn(`[eventService] Invalid schedule date: ${start}`);
          }
        }

        return {
          event_id: eventId,
          start_at: isoStart,
          title,
          description,
        };
      })
      .filter((item) => item.title); // Only include items with a valid title

    if (scheduleInserts.length > 0) {
      // Deduplicate in memory before insert just in case
      const seen = new Set<string>();
      const uniqueScheduleInserts = scheduleInserts.filter(item => {
        const key = `${item.start_at ?? ""}-${item.title ?? ""}-${item.description ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const { error: schedulesError } = await supabase
        .from("event_schedules")
        .insert(uniqueScheduleInserts);

      if (schedulesError) {
        console.warn("Failed to insert schedules", schedulesError);
      }
    }
  }

  if (teamsText && teamsText.trim()) {
    const lines = teamsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const teamInserts = lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        event_id: eventId,
        name: parts[0] || "Team",
        description: parts[1] || null,
        contact_email: parts[2] || null,
      };
    });

    const { error: teamsError } = await supabase
      .from("event_teams")
      .insert(teamInserts);

    if (teamsError) {
      console.warn("Failed to insert teams", teamsError);
    }
  }

  return createdEvent;
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  payload: CreateEventPayload,
) {
  const {
    form,
    tags,
    scheduleText,
    teamsText,
    prizeText,
    faqs,
    uploadedFiles,
    roles,
  } = payload;

  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  if (!user) throw new Error("Authentication required");

  const { data: existingEvent } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  if (existingEvent?.created_by !== user.id) {
    throw new Error("You don't have permission to edit this event");
  }

  const startAt = new Date(`${form.start_date}T${form.start_time}`);
  const endAt =
    form.end_date && form.end_time
      ? new Date(`${form.end_date}T${form.end_time}`)
      : new Date(startAt.getTime() + 8 * 60 * 60 * 1000);
  const registrationStart =
    form.registration_start_date && form.registration_start_time
      ? new Date(
          `${form.registration_start_date}T${form.registration_start_time}`,
        )
      : null;
  const registrationDeadline =
    form.registration_deadline_date && form.registration_deadline_time
      ? new Date(
          `${form.registration_deadline_date}T${form.registration_deadline_time}`,
        )
      : new Date(startAt.getTime() - 24 * 60 * 60 * 1000);

  const updateData: Database["public"]["Tables"]["events"]["Update"] = {
    title: form.title,
    // normalize empty arrays to null to avoid DB type errors
    type: Array.isArray(form.type)
      ? form.type.length
        ? form.type
        : null
      : form.type || null,
    format: Array.isArray(form.format)
      ? form.format.length
        ? form.format
        : null
      : form.format || null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    registration_start: registrationStart
      ? registrationStart.toISOString()
      : null,
    registration_deadline: registrationDeadline.toISOString(),
    location: form.location,
    short_blurb: form.short_blurb ?? "",
    long_description: form.long_description ?? null,
    overview: form.overview ?? null,
    rules: form.rules ?? null,
    prizes: prizeText
      ? prizeText
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean)
      : null,
    faqs:
      faqs && faqs.length
        ? faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : null,
    registration_link: form.registration_link ?? null,
    discord_invite: form.discord_invite ?? null,
    instagram_handle: form.instagram_handle ?? null,
    tags: tags && tags.length ? tags : null,
    roles: roles && roles.length ? roles : null,
    updated_at: new Date().toISOString(),
  };

  if (uploadedFiles && uploadedFiles.length > 0) {
    try {
      const file = uploadedFiles[0].file;
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB");
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const base = slugify(form.title || "event");
      const fileName = `${base}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadError) {
        updateData.image_url = fileName;
      }
    } catch (err) {
      console.warn("Failed to upload event image", err);
    }
  }

  if (form.slug && form.slug.trim() !== "") {
    updateData.slug = form.slug.trim();
  }

  const { data, error } = await supabase
    .from("events")
    .update(updateData)
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw error;

  // Always delete first
  const { error: deleteScheduleError } = await supabase
    .from("event_schedules")
    .delete()
    .eq("event_id", eventId);

  if (deleteScheduleError) {
    console.error("Failed to delete old schedules:", deleteScheduleError);
    // Continue for now, but this is likely why duplicates happen
  }

  // Only insert if there's actual content
  if (scheduleText && scheduleText.trim()) {
    const lines = scheduleText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const seen = new Set<string>(); // ← extra dedup guard
    const scheduleInserts = lines
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        const title = parts[1] || null;
        if (!title) return null;

        const start = parts[0] || null;
        let isoStart: string | null = null;
        if (start) {
          try {
            const d = new Date(start);
            if (!isNaN(d.getTime())) isoStart = d.toISOString();
          } catch (e) {
            // Silently ignore invalid dates
          }
        }

        const key = `${isoStart ?? ""}-${title}-${parts[2] || ""}`;
        if (seen.has(key)) return null; // ← skip true duplicates
        seen.add(key);

        return {
          event_id: eventId,
          start_at: isoStart,
          title,
          description: parts[2] || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (scheduleInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("event_schedules")
        .insert(scheduleInserts);
      if (insertError) console.warn("Failed to insert schedules", insertError);
    }
  }

  await supabase.from("event_teams").delete().eq("event_id", eventId);
  if (teamsText && teamsText.trim()) {
    const lines = teamsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const teamInserts = lines
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        const name = parts[0]?.trim() || null;
        // Only create team entries if name is provided and not empty
        if (!name) return null;
        return {
          event_id: eventId,
          name,
          description: parts[1] || null,
          contact_email: parts[2] || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    // Deduplicate teams by name
    const uniqueTeams = Array.from(
      new Map(teamInserts.map((t) => [t.name, t])).values(),
    );
    if (uniqueTeams.length > 0) {
      await supabase.from("event_teams").insert(uniqueTeams);
    }
  }

  return data;
}

/**
 * UPDATED: Delete an event and its associated image from storage
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    // First, get the event to find the image path
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("image_url")
      .eq("id", eventId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch event: ${fetchError.message}`);
    }

    // Delete the event image from storage if it exists and is a storage path
    if (event?.image_url) {
      // Only delete if it's a storage path (not an absolute URL or local asset)
      const isStoragePath =
        event.image_url &&
        !event.image_url.startsWith("http") &&
        !event.image_url.startsWith("/assets/") &&
        !event.image_url.includes("event-hackathon") &&
        !event.image_url.includes("event-mun") &&
        !event.image_url.includes("event-workshop") &&
        !event.image_url.includes("event-gaming");

      if (isStoragePath) {
        try {
          // Clean the path
          let cleanPath = event.image_url;

          // Remove leading slash
          if (cleanPath.startsWith("/")) {
            cleanPath = cleanPath.substring(1);
          }

          // Remove 'event-images/' prefix if accidentally included
          if (cleanPath.startsWith("event-images/")) {
            cleanPath = cleanPath.replace("event-images/", "");
          }

          await deleteFile(cleanPath, "event-images");
        } catch (imageError) {
          // Don't fail the entire deletion if image deletion fails
          console.error("[deleteEvent] Failed to delete image:", imageError);
        }
      }
    }

    // Delete the event from database
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      throw new Error(`Failed to delete event: ${deleteError.message}`);
    }
  } catch (error) {
    console.error("[deleteEvent] Error:", error);
    throw error;
  }
}

/**
 * Get events created by current user
 */
export async function getMyEvents() {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single event by its slug
 */
export async function getEventBySlug(slug?: string) {
  if (!slug) return { data: null, error: new Error("Slug is required") };

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  return { data, error };
}

export type Role = { name: string; capacity?: number | null };

export type RegistrationRow = {
  id: string;
  created_at: string;
  event_id: string;
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  status?: string | null;
  role?: string | null;
};

export async function fetchEventRegistrations(eventId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as RegistrationRow[]) || [];
}

export async function countRegistrationsByRole(eventId: string) {
  const regs = await fetchEventRegistrations(eventId);
  const counts: Record<string, number> = {};
  regs.forEach((r) => {
    const key = r.role || "__no_role__";
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

export async function canRegister(eventId: string, roleName?: string | null) {
  const { data: evt, error: evtErr } = await supabase
    .from("events")
    .select("roles")
    .eq("id", eventId)
    .single();
  if (evtErr) throw evtErr;
  const roles = (evt as any)?.roles as Role[] | undefined;

  if (!roleName) return true;

  if (!roles || !roles.length) return true;

  const target = roles.find((r) => r.name === roleName);
  if (!target || target.capacity == null) return true;

  const counts = await countRegistrationsByRole(eventId);
  const current = counts[roleName] || 0;
  return current < (target.capacity ?? Infinity);
}

export async function registerForEvent(params: {
  event_id: string;
  user_id?: string | null;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
}) {
  const rpcParams = {
    p_event_id: params.event_id,
    p_user_id: params.user_id ?? null,
    p_role: params.role ?? null,
    p_name: params.name ?? null,
    p_email: params.email ?? null,
    p_phone: params.phone ?? null,
    p_message: params.message ?? null,
  };
  const { data, error } = await (supabase as any).rpc(
    "register_for_event",
    rpcParams,
  );
  if (error) throw error;
  return data;
}

export function registrationsToCSV(rows: RegistrationRow[]) {
  if (!rows || rows.length === 0) return "";
  const headers = [
    "id",
    "created_at",
    "event_id",
    "user_id",
    "name",
    "email",
    "phone",
    "role",
    "status",
    "message",
  ];
  const csv = [headers.join(",")];
  for (const r of rows) {
    const line = headers
      .map((h) => {
        const val = (r as any)[h] ?? "";
        if (typeof val === "string")
          return `"${String(val).replace(/"/g, '""')}"`;
        return `"${String(val ?? "")}"`;
      })
      .join(",");
    csv.push(line);
  }
  return csv.join("\n");
}

export function registrationsToMarkdown(rows: RegistrationRow[]) {
  if (!rows || rows.length === 0) return "";
  const headers = [
    "id",
    "created_at",
    "name",
    "email",
    "phone",
    "role",
    "status",
  ];
  const table = [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
  ];
  for (const r of rows) {
    table.push(
      "| " + headers.map((h) => (r as any)[h] ?? "").join(" | ") + " |",
    );
  }
  return table.join("\n");
}

export async function exportRegistrationsXLSX(eventId: string) {
  // include auth header so the edge function can verify the caller
  const sessionRes = await supabase.auth.getSession();
  const token = sessionRes?.data?.session?.access_token ?? null;
  const invokeOptions: any = { body: JSON.stringify({ eventId }) };
  if (token) invokeOptions.headers = { Authorization: `Bearer ${token}` };
  const fnRes = await (supabase as any).functions.invoke(
    "export-registrations-xlsx",
    invokeOptions,
  );

  if (fnRes?.error) throw fnRes.error;

  let parsed: any = null;
  try {
    parsed =
      typeof fnRes.data === "string" ? JSON.parse(fnRes.data) : fnRes.data;
  } catch (e) {
    parsed = fnRes.data;
  }

  const filename = parsed?.filename || `registrations-${eventId}.xlsx`;

  if (parsed?.url) {
    return { filename, url: parsed.url, storagePath: parsed.storagePath } as {
      filename: string;
      url: string;
      storagePath?: string;
    };
  }

  const b64 =
    parsed?.data ||
    (typeof fnRes.data === "string" && !fnRes.data.startsWith("{")
      ? fnRes.data
      : null);
  if (!b64) throw new Error("No XLSX data returned from server");

  const binStr = atob(b64);
  const len = binStr.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
  const blob = new Blob([u8], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return { filename, blob };
}

export async function registrationsToXLSX(rows: RegistrationRow[]) {
  try {
    const xlsx = await import(/* @vite-ignore */ "xlsx");
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "registrations");
    const wbout = xlsx.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } catch (err) {
    throw new Error(
      "XLSX export requires the 'xlsx' package. Install it with 'pnpm add xlsx' (or 'npm i xlsx') or use CSV/MD export instead.",
    );
  }
}

export default {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventBySlug,
  getMyEvents,
  fetchEventRegistrations,
  countRegistrationsByRole,
  canRegister,
  registerForEvent,
  exportRegistrationsXLSX,
  registrationsToCSV,
  registrationsToMarkdown,
};
