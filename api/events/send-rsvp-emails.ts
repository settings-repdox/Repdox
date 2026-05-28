/**
 * API Route: POST /api/events/send-rsvp-emails
 * Sends RSVP emails to all registered users of an event
 * Can be triggered by a cron job or manually by the event organizer
 *
 * Request body:
 * {
 *   event_id: uuid,
 *   user_token?: string (required if not called from cron with RSVP_SECRET)
 * }
 *
 * Headers:
 * - X-RSVP-Secret: Secret token for cron job authentication
 *
 * Response:
 * { success: true, emails_sent: number, failed: number }
 * or
 * { error: string, code: string }
 */

import { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, verifyAuth } from "../_utils";

const supabase = getSupabaseAdmin();

interface EmailRecipient {
  email: string;
  name?: string;
  event_title: string;
  rsvp_deadline: string;
  event_id: string;
}

async function sendRSVPEmail(recipient: EmailRecipient): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = "noreply@repdox.com";

  if (!RESEND_API_KEY) {
    return { success: false, error: "Resend API key not configured" };
  }

  const rsvpLink = `${process.env.VERCEL_URL || "https://repdox.com"}/event/${recipient.event_id}#rsvp`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7c3aed; color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .button { 
            background-color: #7c3aed; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block;
            margin: 20px 0;
          }
          .footer { color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
          .opt-note { color: #666; font-size: 14px; margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>RSVP Needed: ${recipient.event_title}</h2>
          </div>
          
          <div class="content">
            <p>Hello ${recipient.name || "there"},</p>
            
            <p>We hope you're excited about <strong>${recipient.event_title}</strong>! 
            To help us plan better, we need you to confirm your attendance.</p>
            
            <p><strong>Please let us know if you're:</strong></p>
            <ul>
              <li>Attending</li>
              <li>Not attending</li>
              <li>Maybe attending</li>
            </ul>
            
            <p>
              <a href="${rsvpLink}" class="button">Submit Your RSVP</a>
            </p>
            
            <p><strong>RSVP Deadline:</strong> ${new Date(recipient.rsvp_deadline).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            
            <div class="opt-note">
              <p>Your response helps us manage event logistics and ensure the best experience for everyone.</p>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2026 Repdox. All rights reserved.</p>
            <p>This is an automated RSVP notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipient.email,
        subject: `RSVP Needed: ${recipient.event_title}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend API error:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }

    return { success: true };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: String(error) };
  }
}

async function logEmailStatus(
  eventId: string,
  email: string,
  status: "sent" | "failed",
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from("event_rsvp_email_logs").insert({
      event_id: eventId,
      email,
      status,
      error_message: errorMessage || null,
    });
  } catch (err) {
    console.error("Failed to log email status:", err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event_id, user_token } = req.body;
    const rsvpSecret = req.headers["x-rsvp-secret"];

    // Authenticate either via token or cron secret
    if (!rsvpSecret && !user_token) {
      return res.status(401).json({
        error: "Unauthorized: Missing authentication",
        code: "unauthorized"
      });
    }

    // Check cron secret for scheduled jobs
    if (rsvpSecret) {
      if (rsvpSecret !== process.env.RSVP_CRON_SECRET) {
        return res.status(401).json({
          error: "Invalid cron secret",
          code: "invalid_secret"
        });
      }
    }

    // Check user token if provided
    if (user_token) {
      const userId = await verifyAuth(user_token);
      if (!userId) {
        return res.status(401).json({
          error: "Invalid authentication token",
          code: "invalid_token"
        });
      }

      // Verify user is the event organizer
      const { data: event } = await supabase
        .from("events")
        .select("created_by")
        .eq("id", event_id)
        .single();

      if (!event || event.created_by !== userId) {
        return res.status(403).json({
          error: "Unauthorized: You don't have permission to send RSVP emails for this event",
          code: "forbidden"
        });
      }
    }

    // Validate event_id
    if (!event_id) {
      return res.status(400).json({
        error: "event_id is required",
        code: "missing_event_id"
      });
    }

    // 1. GET EVENT DETAILS
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, rsvp_enabled, rsvp_end_date, rsvp_reminder_sent_at")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        error: "Event not found",
        code: "event_not_found"
      });
    }

    if (!event.rsvp_enabled) {
      return res.status(400).json({
        error: "RSVP is not enabled for this event",
        code: "rsvp_disabled"
      });
    }

    // 2. GET ALL REGISTRATIONS FOR THE EVENT
    const { data: registrations, error: regError } = await supabase
      .from("event_registrations")
      .select("email, name, user_id")
      .eq("event_id", event_id)
      .not("email", "is", null);

    if (regError) {
      console.error("Error fetching registrations:", regError);
      return res.status(500).json({
        error: "Failed to fetch registrations",
        code: "fetch_error"
      });
    }

    if (!registrations || registrations.length === 0) {
      return res.status(200).json({
        success: true,
        emails_sent: 0,
        failed: 0,
        message: "No registrations found for this event"
      });
    }

    // 3. CHECK FOR EXISTING RSVP RESPONSES TO AVOID DUPLICATE EMAILS
    const { data: existingResponses } = await supabase
      .from("event_rsvp_responses")
      .select("email");

    const respondedEmails = new Set(existingResponses?.map(r => r.email) || []);

    // 4. SEND EMAILS TO THOSE WHO HAVEN'T RESPONDED
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const registration of registrations) {
      // Skip if already responded (optional - based on rsvp_type)
      if (respondedEmails.has(registration.email)) {
        continue;
      }

      const emailRecipient: EmailRecipient = {
        email: registration.email,
        name: registration.name || undefined,
        event_title: event.title,
        rsvp_deadline: event.rsvp_end_date || new Date().toISOString(),
        event_id: event.id,
      };

      const result = await sendRSVPEmail(emailRecipient);

      if (result.success) {
        await logEmailStatus(event_id, registration.email, "sent");
        emailsSent++;
      } else {
        await logEmailStatus(event_id, registration.email, "failed", result.error);
        emailsFailed++;
        console.error(`Failed to send RSVP email to ${registration.email}:`, result.error);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 5. UPDATE rsvp_reminder_sent_at on event
    await supabase
      .from("events")
      .update({ rsvp_reminder_sent_at: new Date().toISOString() })
      .eq("id", event_id);

    return res.status(200).json({
      success: true,
      emails_sent: emailsSent,
      failed: emailsFailed,
      total_registrations: registrations.length,
      message: `Successfully sent ${emailsSent} RSVP emails (${emailsFailed} failed)`
    });
  } catch (error) {
    console.error("RSVP email sending error:", error);
    return res.status(500).json({
      error: "Internal server error",
      code: "internal_error"
    });
  }
}
