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

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Missing required fields: name, email, and message",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Validate message length (prevent spam)
    if (message.length < 10 || message.length > 5000) {
      return res.status(400).json({
        error: "Message must be between 10 and 5000 characters",
      });
    }

    // Get Resend API key from environment
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const SUPPORT_EMAIL = "support@repdox.com";
    const FROM_EMAIL = "onboarding@resend.dev"; // Default Resend test domain

    if (!RESEND_API_KEY) {
      console.error("Resend API key not configured");
      return res.status(500).json({
        error: "Email service not configured",
      });
    }

    // Send email to support address via Resend
    const supportEmailPayload = {
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
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

    if (!supportResponse.ok) {
      const errorText = await supportResponse.text();
      console.error("Resend error:", errorText);
      return res.status(500).json({
        error: "Failed to send email",
      });
    }

    // Send confirmation email to the user
    const confirmationPayload = {
      from: FROM_EMAIL,
      to: email,
      subject: "We received your message",
      html: `
        <h2>Thank you for contacting us!</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>We've received your message and our team will get back to you as soon as possible.</p>
        <p><strong>Your message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        <hr>
        <p>Best regards,<br><strong>The Repdox Team</strong></p>
      `,
    };

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(confirmationPayload),
    }).catch((error) => {
      // Log but don't fail if confirmation email doesn't send
      console.warn("Failed to send confirmation email:", error);
    });

    res.status(200).json({
      success: true,
      message: "Message sent successfully. We'll be in touch soon!",
    });
  } catch (error) {
    console.error("Contact form error:", error);
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
