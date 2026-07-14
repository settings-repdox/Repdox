import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type RSVPResponse = "attending" | "not_attending" | "maybe";

interface RSVPFormProps {
  eventId: string;
  eventTitle: string;
  userEmail?: string;
  onSubmitSuccess?: () => void;
}

export default function RSVPForm({
  eventId,
  eventTitle,
  userEmail: initialEmail,
  onSubmitSuccess,
}: RSVPFormProps) {
  const { toast } = useToast();
  const [response, setResponse] = useState<RSVPResponse | "">("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState(initialEmail || "");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingResponse, setExistingResponse] = useState<RSVPResponse | null>(
    null,
  );
  const [rsvpOpen, setRsvpOpen] = useState(true);

  // Check if RSVP window is open and if user has already responded
  useEffect(() => {
    const checkRSVPStatus = async () => {
      try {
        const { data: eventData } = await supabase
          .from("events")
          .select("rsvp_enabled, rsvp_start_date, rsvp_end_date")
          .eq("id", eventId)
          .single();

        if (eventData?.rsvp_enabled && eventData.rsvp_end_date) {
          const isOpen = new Date() < new Date(eventData.rsvp_end_date);
          setRsvpOpen(isOpen);
        } else {
          setRsvpOpen(false);
        }

        if (initialEmail) {
          const { data: existing } = await supabase
            .from("rsvp_responses")
            .select("*")
            .eq("event_id", eventId)
            .eq("email", initialEmail)
            .single();

          if (existing) {
            setExistingResponse(existing.response as RSVPResponse);
            setResponse(existing.response as RSVPResponse);
            setNotes(existing.notes || "");
          }
        }
      } catch (error) {
        console.error("Error checking RSVP status:", error);
      }
    };

    checkRSVPStatus();
  }, [eventId, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!response) {
      toast({
        title: "Error",
        description: "Please select your RSVP response",
        variant: "destructive",
      });
      return;
    }

    if (!email && !initialEmail) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        event_id: eventId,
        response: response as RSVPResponse,
        email: email || initialEmail || "",
        user_id: user?.id,
        notes: notes || undefined,
      };

      await supabase.from("rsvp_responses").upsert({
        event_id: eventId,
        email,
        user_id: user?.id,
        response: response as RSVPResponse,
        notes,
        responded_at: new Date().toISOString(),
      });

      setSubmitted(true);
      toast({
        title: "Success",
        description: `Your RSVP has been recorded as "${response}"`,
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      // Reset form after 2 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error("RSVP submission error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit RSVP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!rsvpOpen) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">
                RSVP window closed
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                The RSVP deadline for this event has passed. If you have
                questions, please contact the event organizer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900">RSVP Submitted</h3>
              <p className="text-sm text-green-800 mt-1">
                Thank you for confirming your attendance. We'll see you at{" "}
                {eventTitle}!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Your Attendance</CardTitle>
        <CardDescription>
          {existingResponse ? (
            <>
              You previously responded as <strong>{existingResponse}</strong>.
              You can update your response below.
            </>
          ) : (
            "Let us know if you're planning to attend this event"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email field for guests */}
          {!initialEmail && (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          )}

          {/* RSVP Response Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">My Response</Label>
            <RadioGroup
              value={response}
              onValueChange={(val) => setResponse(val as RSVPResponse)}
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-purple-50 cursor-pointer">
                <RadioGroupItem value="attending" id="attending" />
                <Label
                  htmlFor="attending"
                  className="flex-1 cursor-pointer font-medium text-green-700"
                >
                  ✓ I'm Attending
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-purple-50 cursor-pointer">
                <RadioGroupItem value="maybe" id="maybe" />
                <Label
                  htmlFor="maybe"
                  className="flex-1 cursor-pointer font-medium text-amber-700"
                >
                  ? Maybe
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-purple-50 cursor-pointer">
                <RadioGroupItem value="not_attending" id="not_attending" />
                <Label
                  htmlFor="not_attending"
                  className="flex-1 cursor-pointer font-medium text-red-700"
                >
                  ✗ I'm Not Attending
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., I'll be bringing a guest, dietary restrictions, questions, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!response || loading}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingResponse ? "Update RSVP" : "Submit RSVP"}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your response will be recorded and visible only to event organizers.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
