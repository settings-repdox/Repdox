import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle2, XCircle, HelpCircle, Download } from "lucide-react";
import eventService from "@/lib/eventService";
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

export default function RSVPAnalytics({ eventId, eventTitle }: RSVPAnalyticsProps) {
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

      // Fetch RSVP summary
      const summaryData = await eventService.getRSVPSummary(eventId);
      setSummary(summaryData);

      // Fetch detailed responses
      const responsesData = await eventService.fetchRSVPResponses(eventId);
      setResponses(responsesData as unknown as RSVPResponse[]);
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
      const result = await eventService.sendRSVPEmails(eventId);

      if (result.success) {
        toast({
          title: "Success",
          description: `Sent ${result.emails_sent} RSVP emails (${result.failed} failed)`,
        });
        setEmailsSent(true);
      }
    } catch (error) {
      console.error("Error sending RSVP emails:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send RSVP emails",
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

    // Convert to CSV
    const headers = ["Email", "Response", "Notes", "Responded At"];
    const rows = responses.map((r) => [
      r.email,
      r.response,
      r.notes || "",
      new Date(r.responded_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
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
      {/* RSVP Summary */}
      <Card>
        <CardHeader>
          <CardTitle>RSVP Summary</CardTitle>
          <CardDescription>Attendance confirmation overview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {total === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No RSVP responses yet</p>
              <Button onClick={handleSendEmails} disabled={sendingEmails} size="lg">
                {sendingEmails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Mail className="mr-2 h-4 w-4" />
                Send RSVP Emails
              </Button>
            </div>
          ) : (
            <>
              {/* Response Rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Response Rate</span>
                  <span className="text-lg font-bold text-purple-600">{responseRate}%</span>
                </div>
                <Progress value={responseRate} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {total} responses received
                </p>
              </div>

              {/* Response Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attending */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Attending</span>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-green-700">{summary?.attending || 0}</p>
                  {total > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {Math.round(((summary?.attending || 0) / total) * 100)}% of responses
                    </p>
                  )}
                </div>

                {/* Maybe */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Maybe</span>
                    <HelpCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-3xl font-bold text-amber-700">{summary?.maybe || 0}</p>
                  {total > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {Math.round(((summary?.maybe || 0) / total) * 100)}% of responses
                    </p>
                  )}
                </div>

                {/* Not Attending */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Not Attending</span>
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-3xl font-bold text-red-700">
                    {summary?.not_attending || 0}
                  </p>
                  {total > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {Math.round(((summary?.not_attending || 0) / total) * 100)}% of responses
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {!emailsSent && (
                <Button
                  onClick={handleSendEmails}
                  disabled={sendingEmails}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  {sendingEmails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Mail className="mr-2 h-4 w-4" />
                  Send RSVP Reminders
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* RSVP Responses Table */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Individual Responses</CardTitle>
                <CardDescription>{responses.length} attendees have responded</CardDescription>
              </div>
              <Button onClick={downloadResponses} size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Response</th>
                    <th className="text-left py-3 px-4 font-medium">Responded</th>
                    <th className="text-left py-3 px-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => (
                    <tr key={response.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{response.email}</td>
                      <td className="py-3 px-4">
                        {response.response === "attending" && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Attending
                          </Badge>
                        )}
                        {response.response === "maybe" && (
                          <Badge className="bg-amber-100 text-amber-800">
                            <HelpCircle className="h-3 w-3 mr-1" />
                            Maybe
                          </Badge>
                        )}
                        {response.response === "not_attending" && (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Attending
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(response.responded_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {response.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
