// @ts-nocheck: Deno handles type checking for this file; suppressing standard TS engine clash.
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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
    const { eventId, status } = body || {};

    if (!eventId || !status) {
      return new Response(JSON.stringify({ error: "eventId and status required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Fetch event title and creator ID
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("title, created_by")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      console.error("Event fetch failed:", eventErr);
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch user email using admin client
    const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(event.created_by);

    if (userErr || !user || !user.email) {
      console.error("User fetch failed:", userErr);
      return new Response(JSON.stringify({ error: "Creator email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Construct email content
    const isApproved = status === "approved";
    const subject = isApproved ? `Event Approved: ${event.title}` : `Event Update: ${event.title}`;
    const message = isApproved
      ? `Congratulations! Your event "${event.title}" has been approved and is now live on Repdox.`
      : `We regret to inform you that your event submission "${event.title}" was not approved at this time. If you have questions, please contact the admin team.`;

    // 4. Send email via SendGrid
    if (SENDGRID_API_KEY && SENDGRID_FROM) {
      const payload = {
        personalizations: [{ to: [{ email: user.email }] }],
        from: { email: SENDGRID_FROM, name: "Repdox Admin" },
        subject: subject,
        content: [
          {
            type: "text/html",
            value: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: ${isApproved ? "#16a34a" : "#dc2626"}; text-align: center;">${subject}</h2>
              <p style="font-size: 16px; line-height: 1.5; color: #333;">Hello,</p>
              <p style="font-size: 16px; line-height: 1.5; color: #333;">${message}</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="https://repdox.com" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Visit Repdox</a>
              </div>
              <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #666; text-align: center;">
                This is an automated notification from Repdox. Please do not reply directly to this email.
              </p>
            </div>
          `,
          },
        ],
      };

      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!sgRes.ok) {
        const errorText = await sgRes.text();
        console.error("SendGrid failed:", errorText);
        throw new Error("Failed to send email");
      }

      return new Response(JSON.stringify({ ok: true, sent: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      console.warn("SENDGRID_API_KEY or SENDGRID_FROM missing");
      return new Response(JSON.stringify({ ok: true, sent: false, warning: "Email provider not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("event-notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

