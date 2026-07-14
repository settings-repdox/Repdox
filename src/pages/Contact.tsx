import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Send, Users } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    // Trim and validate inputs
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    // Client-side validation
    if (!name || !email || !message) {
      setSubmitStatus("error");
      setErrorMessage("Please fill in all fields.");
      setIsSubmitting(false);
      return;
    }

    if (message.length < 10) {
      setSubmitStatus("error");
      setErrorMessage("Message must be at least 10 characters.");
      setIsSubmitting(false);
      return;
    }

    if (message.length > 5000) {
      setSubmitStatus("error");
      setErrorMessage("Message must be less than 5000 characters.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/contact/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      });

      // Handle empty or non-JSON responses
      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      }

      if (!response.ok) {
        setSubmitStatus("error");
        setErrorMessage(
          data.error || "Failed to send message. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      setSubmitStatus("success");
      setForm({ name: "", email: "", message: "" });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus("idle");
      }, 5000);
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage("An error occurred. Please try again.");
      console.error("Contact form error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Get in Touch
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions or want to partner with us? We'd love to hear from
            you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-card rounded-2xl p-8 border border-border shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground font-medium">
                    Your Name
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="bg-background/50 border-border/50 focus:border-accent focus:ring-accent/20"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-foreground font-medium"
                  >
                    Your Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                    className="bg-background/50 border-border/50 focus:border-accent focus:ring-accent/20"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <Label
                  htmlFor="message"
                  className="text-foreground font-medium"
                >
                  Your Message
                </Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  rows={6}
                  required
                  className="bg-background/50 border-border/50 focus:border-accent focus:ring-accent/20 resize-none"
                  placeholder="Tell us what's on your mind..."
                />
              </div>

              {/* Success Message */}
              {submitStatus === "success" && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-500 font-medium">
                    ✓ Message sent successfully!
                  </p>
                  <p className="text-emerald-500/80 text-sm mt-1">
                    We'll get back to you as soon as possible.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {submitStatus === "error" && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-destructive font-medium">
                    ✗ Failed to send message
                  </p>
                  <p className="text-destructive/80 text-sm mt-1">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground font-semibold px-8 py-3 rounded-lg shadow-accent transition-all duration-300 active-scale"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Message
                  </span>
                )}
              </button>
            </form>
          </motion.div>

          {/* Contact Info Cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:border-accent/40 transition-colors duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent/10 border border-accent/20">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">
                  Join Our Community
                </h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Connect with fellow event enthusiasts, get updates, and
                collaborate.
              </p>
              <a
                href="https://discord.gg/y9kRMNn49K"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="w-full hover:bg-accent/10 hover:border-accent/50 transition-all"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Join Discord
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
