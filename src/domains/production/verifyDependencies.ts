import { resolveService } from "@/core/services/di";

export async function verifyProductionDependencies() {
  const results: Record<string, { present: boolean; message?: string }> = {};

  try {
    const evt = resolveService("EventService");
    results["EventService"] = { present: !!evt };
  } catch (e: any) {
    results["EventService"] = {
      present: false,
      message: String(e?.message || e),
    };
  }

  try {
    const reg = resolveService("RegistrationService");
    results["RegistrationService"] = { present: !!reg };
  } catch (e: any) {
    results["RegistrationService"] = {
      present: false,
      message: String(e?.message || e),
    };
  }

  // Check for supabase client availability
  try {
    // dynamic import to avoid bundling assumptions
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { supabase } = await import("@/integrations/supabase/client");
    results["supabaseClient"] = { present: !!supabase };
  } catch (e: any) {
    results["supabaseClient"] = {
      present: false,
      message: String(e?.message || e),
    };
  }

  return results;
}
