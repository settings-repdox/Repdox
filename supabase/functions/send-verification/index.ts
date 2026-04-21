// @ts-nocheck: Deno handles type checking for this file; suppressing standard TS engine clash.
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { userId, type, contact, ttlSeconds = 3600 } = body || {};

    if (!userId || !type || !contact) {
      return new Response(JSON.stringify({ error: "userId, type and contact required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE");

    if (!SERVICE_ROLE_KEY) {
      console.error("Missing Service Role Key");
      return new Response(JSON.stringify({ error: "Configuration error: Missing key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { "x-supabase-function": "send-verification" } },
    });

    // Rate limit check: don't allow repeat sends within 60 seconds
    const { data: last, error: lastErr } = await supabase
      .from("profile_verifications")
      .select("created_at")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("contact", contact)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastErr) console.warn("Rate check failed:", lastErr);

    if (last && last.length > 0 && last[0].created_at) {
      const createdAt = new Date(last[0].created_at).getTime();
      if (Date.now() - createdAt < 60 * 1000) {
        return new Response(JSON.stringify({ error: "Rate limit: please wait 60 seconds" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate token
    const phoneOTP = () => String(Math.floor(100000 + Math.random() * 900000));
    const randomTokenString = (len = 32) => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let out = "";
      for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
      return out;
    };

    const token = type === "phone" ? phoneOTP() : randomTokenString(32);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { error: upsertError } = await supabase.from("profile_verifications").upsert(
      {
        user_id: userId,
        type,
        contact,
        token,
        expires_at: expiresAt,
        verified: false,
      },
      { onConflict: "user_id,type" }
    );

    if (upsertError) {
      console.error("Upsert verification failed:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to create verification record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delivery
    let sent = false;
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM");
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM");

    if (type === "email" && SENDGRID_API_KEY && SENDGRID_FROM) {
      try {
        const payload = {
          personalizations: [{ to: [{ email: contact }] }],
          from: { email: SENDGRID_FROM },
          subject: "Your verification token",
          content: [{ type: "text/plain", value: `Your verification token is: ${token}` }],
        };
        const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (sgRes.ok) sent = true;
      } catch (e) {
        console.warn("SendGrid delivery failed:", e);
      }
    }

    if (type === "phone" && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) {
      try {
        const form = new URLSearchParams();
        form.set("To", contact);
        form.set("From", TWILIO_FROM);
        form.set("Body", `Your verification code is ${token}`);
        const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
          body: form,
        });
        if (twRes.ok) sent = true;
      } catch (e) {
        console.warn("Twilio delivery failed:", e);
      }
    }

    const responseBody: { ok: boolean; sent: boolean; token?: string } = { ok: true, sent };
    // In development mode, return the token for testing
    if (Deno.env.get("ENVIRONMENT") === "development") {
      responseBody.token = token;
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-verification error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});