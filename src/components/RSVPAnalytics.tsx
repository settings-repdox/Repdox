import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface RSVPAnalyticsProps {
  eventId: string;
  eventTitle: string;
}

interface RSVPSummary {
  total_responses: number;
  attending: number;
  not_attending: number;
  maybe: number;
  response_rate: number;
}

interface RSVPResponse {
  id: string;
  email: string;
  response: "attending" | "not_attending" | "maybe";
  notes?: string;
  responded_at: string;
}

export default function RSVPAnalytics({
  eventId,
  eventTitle,
}: RSVPAnalyticsProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<RSVPSummary | null>(null);
  const [responses, setResponses] = useState<RSVPResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailsSent, setEmailsSent] = useState(false);

  useEffect(() => {
    loadRSVPData();
  }, [eventId]);

  const loadRSVPData = async () => {
    try {
      setLoading(true);
      const { data: rsvpData, error } = await supabase
        .from("rsvp_responses")
        .select("*")
        .eq("event_id", eventId)
        .order("responded_at", { ascending: false });

      if (error) throw error;

      const responses = (rsvpData || []) as RSVPResponse[];
      setResponses(responses);

      const total = responses.length;
      const attending = responses.filter(
        (r) => r.response === "attending",
      ).length;
      const notAttending = responses.filter(
        (r) => r.response === "not_attending",
      ).length;
      const maybe = responses.filter((r) => r.response === "maybe").length;

      setSummary({
        total_responses: total,
        attending,
        not_attending: notAttending,
        maybe,
        response_rate: total > 0 ? attending / total : 0,
      });
    } catch (error) {
      console.error("Error loading RSVP data:", error);
      toast({
        title: "Error",
        description: "Failed to load RSVP data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (emailsSent) {
      toast({
        title: "Info",
        description: "RSVP emails have already been sent for this event.",
      });
      return;
    }

    try {
      setSendingEmails(true);
      const response = await fetch("/api/events/send-rsvp-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      if (!response.ok) {
        throw new Error("Failed to send RSVP emails");
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: `Sent ${result.emails_sent} RSVP emails (${result.failed} failed)`,
        });
        setEmailsSent(true);
      } else {
        throw new Error(result.message || "Email send failed");
      }
    } catch (error) {
      console.error("Error sending RSVP emails:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send RSVP emails",
        variant: "destructive",
      });
    } finally {
      setSendingEmails(false);
    }
  };

  const downloadResponses = () => {
    if (responses.length === 0) {
      toast({
        title: "No data",
        description: "No RSVP responses to download yet.",
      });
      return;
    }

    const headers = ["Email", "Response", "Notes", "Responded At"];
    const rows = responses.map((r) => [
      r.email,
      r.response,
      r.notes || "",
      new Date(r.responded_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    );

    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rsvp-responses-${eventTitle.replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Downloaded",
      description: "RSVP responses exported as CSV",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = summary?.total_responses || 0;
  const responseRate = Math.round((summary?.response_rate || 0) * 100) / 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>RSVP Summary</CardTitle>
          <CardDescription>Attendance confirmation overview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {total === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No RSVP responses yet</p>
              <Button
                onClick={handleSendEmails}
                disabled={sendingEmails}
                size="lg"
              >
                {sendingEmails && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Mail className="mr-2 h-4 w-4" />
                Send RSVP Emails
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Response Rate</span>
                  <span className="text-lg font-bold text-purple-600">
                    {responseRate}%
                  </span>
                </div>
                <Progress value={responseRate} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {total} responses received
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Attending
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-green-700">
                    {summary?.attending || 0}
                  </p>
                  {total > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {Math.round(((summary?.attending || 0) / total) * 100)}%
                      of responses
                    </p>
                  )}
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Not attending
                    </span>
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-3xl font-bold text-red-700">
                    {summary?.not_attending || 0}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Maybe
                    </span>
                    <HelpCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <p className="text-3xl font-bold text-yellow-700">
                    {summary?.maybe || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Responses: {total}</Badge>
                <Button onClick={downloadResponses} size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
