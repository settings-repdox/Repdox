// Supabase Edge Function (Deno + TypeScript)
// Deploy with: `supabase functions deploy send-verification`

import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Some CLI secret stores block envs starting with `SUPABASE_`. Accept an alternate var name as fallback.
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE");
if (!SERVICE_ROLE_KEY) console.warn("Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY in Function environment variables.");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM = Deno.env.get("TWILIO_FROM");
const DEV_TWILIO_LOG = Deno.env.get("DEV_TWILIO_LOG") === "true"; // set to true for extra debug info in responses and logs

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY ?? "", {
  global: { headers: { "x-supabase-function": "send-verification" } },
});

function randomToken(len = 32) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function phoneOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const body = await req.json();
    const { userId, type, contact, ttlSeconds = 3600 } = body || {};
    if (!userId || !type || !contact) {
      return new Response(JSON.stringify({ error: "userId, type and contact required" }), { status: 400 });
    }

    // Basic validation for type
    if (type !== 'email' && type !== 'phone') {
      return new Response(JSON.stringify({ error: 'type must be "email" or "phone"' }), { status: 400 });
    }

    // Ensure we have a service role key available (required to write to DB)
    if (!SERVICE_ROLE_KEY) {
      console.error('Service role key missing');
      return new Response(JSON.stringify({ error: 'service_role_key_missing' }), { status: 500 });
    }

    // Verify the user exists in auth.users before inserting (gives clearer errors for dashboard tests)
    try {
      // Prefer admin API if available
      let userFound = false;
      try {
        const authAdmin = supabase.auth as unknown as { admin: { getUserById: (id: string) => Promise<{ data: { user: any } }> } };
        if (authAdmin.admin?.getUserById) {
          const ures = await authAdmin.admin.getUserById(userId);
          if (ures?.data?.user) userFound = true;
        }
      } catch (e) {
        // ignore - fall through to table check
      }

      if (!userFound) {
        try {
          // Query the auth.users table directly using the service role key
          const { data: urow, error: uerr } = await supabase.from('auth.users').select('id').eq('id', userId).single();
          if (uerr) {
            console.warn('auth.users lookup error', uerr);
          } else if (urow) {
            userFound = true;
          }
        } catch (e) {
          console.warn('auth.users lookup exception', e);
        }
      }

      if (!userFound) {
        return new Response(JSON.stringify({ error: 'user_not_found' }), { status: 404 });
      }
    } catch (e) {
      console.warn('User existence check failed', e);
      // proceed; insertion will give a clear error if user id is invalid
    }

    // Rate limit: don't allow repeat sends within 60 seconds
    const { data: last, error: lastErr } = await supabase
      .from("profile_verifications")
      .select("created_at")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("contact", contact)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastErr) console.warn("Rate check failed", lastErr);

    if (last && last.length && last[0].created_at) {
      const createdAt = new Date(last[0].created_at).getTime();
      if (Date.now() - createdAt < 60 * 1000) {
        return new Response(JSON.stringify({ error: "Rate limit: try again later" }), { status: 429 });
      }
    }

    const token = type === "phone" ? phoneOTP() : randomToken(32);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { data, error } = await supabase.from("profile_verifications").insert([
      { user_id: userId, type, contact, token, expires_at: expiresAt, verified: false },
    ]);

    if (error) {
      console.error("Insert verification failed", error);
      const msg = error.message || String(error);
      return new Response(JSON.stringify({ error: "insert_failed", detail: msg }), { status: 500 });
    }

    // Attempt delivery
    let sent = false;
    let providerSid: string | null = null;
    let providerStatus: string | null = null;
    // Email via SendGrid
    if (type === "email" && SENDGRID_API_KEY && SENDGRID_FROM) {
      try {
        const payload = {
          personalizations: [{ to: [{ email: contact }] }],
          from: { email: SENDGRID_FROM },
          subject: "Your verification token",
          content: [{ type: "text/plain", value: `Your verification token is: ${token}` }],
        };
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        sent = true;
      } catch (e) {
        console.warn("SendGrid send failed", e);
      }
    }

    // SMS via Twilio
    if (type === "phone" && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const form = new URLSearchParams();
        form.set("To", contact);
        form.set("From", TWILIO_FROM);
        form.set("Body", `Your verification code is ${token}`);

        const twResp = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}` },
          body: form,
        });

        const twText = await twResp.text();
        let twJson: { sid?: string; status?: string } | null = null;
        try {
          twJson = JSON.parse(twText);
        } catch (e) {
          // ignore non-json bodies
        }

        providerSid = twJson?.sid ?? null;
        providerStatus = twJson?.status ?? (twResp.ok ? 'queued' : `error:${twResp.status}`);

        if (twResp.ok) {
          sent = true;
        } else {
          console.warn('Twilio send failed', twResp.status, twText);
        }

        // Persist provider info to DB for observability
        try {
          if (data && data[0] && data[0].id) {
            await supabase.from('profile_verifications').update({ provider: 'twilio', provider_sid: providerSid, provider_status: providerStatus }).eq('id', data[0].id);
          }
        } catch (e) {
          console.warn('Failed to persist Twilio provider info', e);
        }
      } catch (e) {
        console.warn("Twilio send failed", e);
      }
    }

    // If neither provider set, we still return success so that dev/testing can rely on DB entry / token dumps
    const responseBody: Record<string, unknown> = { ok: true, sent };
    if (DEV_TWILIO_LOG) {
      responseBody.provider_sid = providerSid;
      responseBody.provider_status = providerStatus;
      // expose token in dev mode to make end-to-end testing easier (only when explicitly enabled)
      responseBody.token = token;
    }
    return new Response(JSON.stringify(responseBody), { status: 200 });
  } catch (err) {
    console.error("send-verification error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'internal_error', detail: msg }), { status: 500 });
  }
});