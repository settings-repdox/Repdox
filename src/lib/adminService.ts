import { supabase } from "@/integrations/supabase/client";
import { resolveService } from "@/core/services/di";
import type { IPermissionService } from "@/core/services/interfaces/IPermissionService";
import type { INotificationService } from "@/core/services/interfaces/INotificationService";
import type { IEventService } from "@/domains/events/interfaces/IEventService";

const permission = () =>
  resolveService<IPermissionService>("PermissionService");
const notification = () =>
  resolveService<INotificationService>("NotificationService");

export const ADMIN_EMAILS = [
  "shlokram5mar@gmail.com",
  "amishgandhi316@gmail.com",
];

export async function isUserAdmin(): Promise<boolean> {
  return permission().isUserAdmin();
}

/**
 * Fetch all events pending approval (is_active = false)
 */
export async function getPendingEvents() {
  try {
    const eventCore = resolveService<IEventService>("EventService");
    const all = await eventCore.listEvents({ limit: 1000, offset: 0 });
    return (all || [])
      .filter((e) => !e.is_active)
      .sort((a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  } catch (e) {
    // Fall back to legacy query if core is unavailable
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .or("is_active.eq.false,is_active.is.null")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

/**
 * Approve an event (set is_active = true)
 */
export async function approveEvent(eventId: string) {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");
  try {
    const eventCore = resolveService<IEventService>("EventService");
    await eventCore.updateEvent(eventId, {
      is_active: true,
      updated_at: new Date().toISOString(),
    } as any);

    // Trigger notification via NotificationService
    notification()
      .sendEventNotification(eventId, "approved")
      .catch((e) => console.error("Notification failed", e));

    return true;
  } catch (e) {
    const { error } = await supabase
      .from("events")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", eventId);

    if (error) throw error;
    notification()
      .sendEventNotification(eventId, "approved")
      .catch((e) => console.error("Notification failed", e));
    return true;
  }
}

/**
 * Reject/Delete an event
 */
export async function rejectEvent(eventId: string) {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  // Notify before deleting since we need the event data (creator ID)
  try {
    await notification().sendEventNotification(eventId, "rejected");
  } catch (e) {
    console.error("Rejection notification failed", e);
  }

  try {
    const eventCore = resolveService<IEventService>("EventService");
    await eventCore.deleteEvent(eventId);
    return true;
  } catch (e) {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) throw error;
    return true;
  }
}

/**
 * Volunteer Application Interface
 */
export interface VolunteerApplication {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  role_preference: string;
  motivation: string;
  status: "pending" | "interview" | "approved" | "rejected";
  interview_time?: string;
  meet_link?: string;
}

/**
 * Fetch all volunteer applications
 */
export async function getVolunteerApplications(): Promise<
  VolunteerApplication[]
> {
  const { data, error } = await supabase
    .from("volunteer_applications" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as VolunteerApplication[]) || [];
}

/**
 * Update volunteer application status and optionally interview details
 */
export async function updateVolunteerStatus(
  applicationId: string,
  status: string,
  interviewTime?: string,
  meetLink?: string,
) {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  const updateData: Partial<VolunteerApplication> & { updated_at: string } = {
    status: status as any,
    updated_at: new Date().toISOString(),
  };

  if (interviewTime) updateData.interview_time = interviewTime;
  if (meetLink) updateData.meet_link = meetLink;

  const { error } = await supabase
    .from("volunteer_applications" as any)
    .update(updateData)
    .eq("id", applicationId);

  if (error) throw error;
  return true;
}
