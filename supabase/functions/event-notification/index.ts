// Supabase Edge Function to notify users about event status changes
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    
    const { eventId, status } = await req.json();
    if (!eventId || !status) {
      return new Response(JSON.stringify({ error: "eventId and status required" }), { status: 400 });
    }

    // 1. Fetch event title and creator ID
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("title, created_by")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      console.error("Event fetch failed", eventErr);
      return new Response(JSON.stringify({ error: "Event not found" }), { status: 404 });
    }

    // 2. Fetch user email using admin client (service role)
    // NOTE: This requires fetching from auth.users which is safe in Edge Function with service_role
    const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(event.created_by);

    if (userErr || !user || !user.email) {
      console.error("User fetch failed", userErr);
      return new Response(JSON.stringify({ error: "Creator email not found" }), { status: 404 });
    }

    // 3. Construct email content
    const isApproved = status === "approved";
    const subject = isApproved 
      ? `Event Approved: ${event.title}` 
      : `Event Update: ${event.title}`;
    
    const message = isApproved
      ? `Congratulations! Your event "${event.title}" has been approved and is now live on Repdox.`
      : `We regret to inform you that your event submission "${event.title}" was not approved at this time. If you have questions, please contact the admin team.`;

    // 4. Send email via SendGrid
    if (SENDGRID_API_KEY && SENDGRID_FROM) {
      const payload = {
        personalizations: [{ to: [{ email: user.email }] }],
        from: { email: SENDGRID_FROM, name: "Repdox Admin" },
        subject: subject,
        content: [{ 
          type: "text/html", 
          value: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
              <h2 style="color: ${isApproved ? '#16a34a' : '#dc2626'}; text-align: center;">${subject}</h2>
              <p style="font-size: 16px; line-height: 1.5; color: #333;">Hello,</p>
              <p style="font-size: 16px; line-height: 1.5; color: #333;">${message}</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${SUPABASE_URL.replace('.supabase.co', '')}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Visit Repdox</a>
              </div>
              <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #666; text-align: center;">
                This is an automated notification from Repdox. Please do not reply directly to this email.
              </p>
            </div>
          ` 
        }],
      };

      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${SENDGRID_API_KEY}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(payload),
      });

      if (!sgRes.ok) {
        const error = await sgRes.text();
        console.error("SendGrid failed", error);
        throw new Error("Failed to send email via SendGrid");
      }

      return new Response(JSON.stringify({ ok: true, sent: true }), { status: 200 });
    } else {
      console.warn("SENDGRID_API_KEY or SENDGRID_FROM missing");
      return new Response(JSON.stringify({ ok: true, sent: false, warning: "Email provider not configured" }), { status: 200 });
    }

  } catch (err) {
    console.error("event-notification error", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
