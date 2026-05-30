/**
 * Environment Configuration for Registration Portal
 *
 * This file should be generated during build/deployment with actual environment variables.
 * In development, you can update these manually.
 * In production (Vercel), use a build script to inject the values from environment variables.
 *
 * See: ../../README.md for setup instructions
 */

window.REGISTRATION_CONFIG = {
  // These MUST match VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your .env file
  // Get these from: https://supabase.com/dashboard -> Settings -> API

  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here",

  // Set to true to enable debug logging
  DEBUG: false,
};

if (window.REGISTRATION_CONFIG.DEBUG) {
  console.log("[Registration Config] Loaded:", {
    url: window.REGISTRATION_CONFIG.SUPABASE_URL,
    keySet: !!window.REGISTRATION_CONFIG.SUPABASE_ANON_KEY,
  });
}
