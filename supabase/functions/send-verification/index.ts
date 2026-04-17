// Supabase Edge Function (Deno + TypeScript)
// Entrypoint expected by Supabase CLI: supabase/functions/send-verification/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Some CLI secret stores block envs starting with `SUPABASE_`. Accept an alternate var name as fallback.
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE");
if (!SERVICE_ROLE_KEY) console.warn("Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY in Function environment variables.");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM = Deno.env.get("TWILIO_FROM");

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

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const body = await req.json();
    const { userId, type, contact, ttlSeconds = 3600 } = body || {};
    if (!userId || !type || !contact) {
      return new Response(JSON.stringify({ error: "userId, type and contact required" }), { status: 400 });
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

    if (last && (last as any).length && (last as any)[0].created_at) {
      const createdAt = new Date((last as any)[0].created_at).getTime();
      if (Date.now() - createdAt < 60 * 1000) {
        return new Response(JSON.stringify({ error: "Rate limit: try again later" }), { status: 429 });
      }
    }

    const token = type === "phone" ? phoneOTP() : randomToken(32);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { data, error } = await supabase.from("profile_verifications").upsert(
      [
        { user_id: userId, type, contact, token, expires_at: expiresAt, verified: false },
      ],
      { onConflict: "user_id, type" }
    );

    if (error) {
      console.error("Insert verification failed", error);
      return new Response(JSON.stringify({ error: "Failed to create verification" }), { status: 500 });
    }

    // Attempt delivery
    let sent = false;
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
        await fetch(url, {
          method: "POST",
          headers: { Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}` },
          body: form,
        });
        sent = true;
      } catch (e) {
        console.warn("Twilio send failed", e);
      }
    }

    // If neither provider set, we still return success so that dev/testing can rely on DB entry / token dumps
    return new Response(JSON.stringify({ ok: true, sent, token }), { status: 200 });
  } catch (err) {
    console.error("send-verification error", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});