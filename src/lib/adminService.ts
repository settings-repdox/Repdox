import { supabase } from "@/integrations/supabase/client";

// List of admin emails. 
// USER: Add the 3 admin emails here.
export const ADMIN_EMAILS = [
  "shlokram5mar@gmail.com",
  "amishgandhi316@gmail.com",
];

/**
 * Check if a user is an admin based on their email.
 */
export async function isUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return false;
  
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

/**
 * Fetch all events pending approval (is_active = false)
 */
export async function getPendingEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or("is_active.eq.false,is_active.is.null")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Approve an event (set is_active = true)
 */
export async function approveEvent(eventId: string) {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  const { error } = await supabase
    .from("events")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw error;
  return true;
}

/**
 * Reject/Delete an event
 */
export async function rejectEvent(eventId: string) {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) throw new Error("Not authorized");

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId);

  if (error) throw error;
  return true;
}
