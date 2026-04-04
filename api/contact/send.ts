/**
 * API Route: POST /api/contact/send
 * Sends a contact form submission email to support@repdox.com via Resend
 *
 * Security:
 * - Validates email format
 * - Sanitizes input
 * - Rate limiting via basic validation
 *
 * Request body:
 * {
 *   name: string,
 *   email: string,
 *   message: string
 * }
 *
 * Response:
 * { success: true, message: string }
 * or
 * { error: string }
 *
 * Environment variables required:
 * - RESEND_API_KEY: Your Resend API key from https://resend.com
 */

import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, message } = req.body;

    // Trim and validate required fields
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedMessage = typeof message === "string" ? message.trim() : "";

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      console.warn("Contact form: Missing required fields", {
        hasName: !!trimmedName,
        hasEmail: !!trimmedEmail,
        hasMessage: !!trimmedMessage,
      });
      return res.status(400).json({
        error: "Missing required fields: name, email, and message",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      console.warn("Contact form: Invalid email", { email: trimmedEmail });
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Validate message length (prevent spam)
    if (trimmedMessage.length < 10) {
      console.warn("Contact form: Message too short", {
        length: trimmedMessage.length,
      });
      return res.status(400).json({
        error: "Message must be at least 10 characters",
      });
    }

    if (trimmedMessage.length > 5000) {
      console.warn("Contact form: Message too long", {
        length: trimmedMessage.length,
      });
      return res.status(400).json({
        error: "Message must be less than 5000 characters",
      });
    }

    // Get Resend API key from environment
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const SUPPORT_EMAIL = "support@repdox.com";
    const FROM_EMAIL = "onboarding@resend.dev"; // Default Resend test domain

    if (!RESEND_API_KEY) {
      console.error("Resend API key not configured", {
        hasKey: !!process.env.RESEND_API_KEY,
        envKeys: Object.keys(process.env).filter((k) => k.includes("RESEND")),
      });
      return res.status(500).json({
        error: "Email service not configured",
      });
    }

    console.log("Sending contact form email", {
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      replyTo: trimmedEmail,
      messageLength: trimmedMessage.length,
    });

    // Send email to support address via Resend
    const supportEmailPayload = {
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      replyTo: trimmedEmail,
      subject: `New Contact Form Submission from ${trimmedName}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(trimmedMessage).replace(/\n/g, "<br>")}</p>
      `,
    };

    const supportResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supportEmailPayload),
    });

    let supportResponseData: any = {};
    try {
      const responseText = await supportResponse.text();
      if (responseText) {
        supportResponseData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error("Failed to parse Resend response:", parseError);
      supportResponseData = { error: "Invalid response from email service" };
    }

    if (!supportResponse.ok) {
      console.error("Resend error:", {
        status: supportResponse.status,
        statusText: supportResponse.statusText,
        data: supportResponseData,
      });
      return res.status(500).json({
        error: "Failed to send email",
      });
    }

    // Send confirmation email to the user
    const confirmationPayload = {
      from: FROM_EMAIL,
      to: trimmedEmail,
      subject: "We received your message",
      html: `
        <h2>Thank you for contacting us!</h2>
        <p>Hi ${escapeHtml(trimmedName)},</p>
        <p>We've received your message and our team will get back to you as soon as possible.</p>
        <p><strong>Your message:</strong></p>
        <p>${escapeHtml(trimmedMessage).replace(/\n/g, "<br>")}</p>
        <hr>
        <p>Best regards,<br><strong>The Repdox Team</strong></p>
      `,
    };

    const confirmationResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(confirmationPayload),
    }).catch((error) => {
      // Log but don't fail if confirmation email doesn't send
      console.warn("Failed to send confirmation email:", error);
      return null;
    });

    if (!confirmationResponse?.ok) {
      console.warn("Confirmation email failed to send");
    }

    res.status(200).json({
      success: true,
      message: "Message sent successfully. We'll be in touch soon!",
    });
  } catch (error) {
    console.error("Contact form error:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: "An error occurred while processing your request",
    });
  }
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
