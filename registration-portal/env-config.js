/**
 * Environment Configuration for Registration Portal
 *
 * VERCEL: This file is AUTO-GENERATED during the build process from environment variables.
 *         Do NOT commit your actual credentials. They come from Vercel's environment variables.
 *
 * LOCAL DEV: If running locally, update these with your Supabase credentials:
 *   - Get URL and Key from: https://supabase.com/dashboard -> Settings -> API
 *   - Or run: source .env && ./registration-portal/setup-registration-portal.sh
 */

window.REGISTRATION_CONFIG = {
  // Auto-injected by build.sh during Vercel deployment
  // For local development, update these values
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here",

  DEBUG: false,
};

if (window.REGISTRATION_CONFIG.DEBUG) {
  console.log("[Registration Config] Loaded:", {
    url: window.REGISTRATION_CONFIG.SUPABASE_URL,
    keySet: !!window.REGISTRATION_CONFIG.SUPABASE_ANON_KEY,
  });
}
