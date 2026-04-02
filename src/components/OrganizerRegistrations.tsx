import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import eventService, { RegistrationRow } from "@/lib/eventService";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/timeUtils";

export default function OrganizerRegistrations({
  eventId,
}: {
  eventId: string;
}) {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const regs = await eventService.fetchEventRegistrations(eventId);
      setRegistrations(regs);
      setCounts(await eventService.countRegistrationsByRole(eventId));
    } catch (err: any) {
      toast({
        title: "Failed to load registrations",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleExport = (format: "csv" | "md") => {
    try {
      let payload = "";
      if (format === "csv")
        payload = eventService.registrationsToCSV(registrations);
      else payload = eventService.registrationsToMarkdown(registrations);

      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations-${eventId}.${format === "csv" ? "csv" : "md"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${registrations.length} registrations`}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleExport("csv")}>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => handleExport("md")}>
              Export MD
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const text = eventService.registrationsToCSV(registrations);
                  await navigator.clipboard.writeText(text);
                  toast({
                    title: "Copied",
                    description: "CSV copied to clipboard",
                  });
                } catch (err: any) {
                  toast({
                    title: "Copy failed",
                    description: err?.message || String(err),
                    variant: "destructive",
                  });
                }
              }}
            >
              Copy CSV
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const text =
                    eventService.registrationsToMarkdown(registrations);
                  await navigator.clipboard.writeText(text);
                  toast({
                    title: "Copied",
                    description: "Markdown table copied to clipboard",
                  });
                } catch (err: any) {
                  toast({
                    title: "Copy failed",
                    description: err?.message || String(err),
                    variant: "destructive",
                  });
                }
              }}
            >
              Copy MD
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const res = await eventService.exportRegistrationsXLSX(
                    eventId as string,
                  );
                  if ((res as any).url) {
                    // open signed URL in new tab
                    window.open((res as any).url, "_blank");
                    toast({
                      title: "Export ready",
                      description:
                        "A signed download link opened in a new tab.",
                    });
                    return;
                  }

                  const { filename, blob } = res as {
                    filename: string;
                    blob: Blob;
                  };
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err: any) {
                  toast({
                    title: "XLSX export failed",
                    description: err?.message || String(err),
                    variant: "destructive",
                  });
                }
              }}
            >
              Export XLSX
            </Button>
          </div>
        </div>

        {Object.keys(counts).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="border rounded p-2">
                <div className="font-medium">
                  {k === "__no_role__" ? "Unspecified" : k}
                </div>
                <div className="text-sm text-muted-foreground">
                  {v} registrations
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th className="text-left">Time</th>
                <th className="text-left">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Role</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 text-sm">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-sm">{r.email}</td>
                  <td className="py-2 text-sm">{r.phone}</td>
                  <td className="py-2 text-sm">{r.role || "-"}</td>
                  <td className="py-2 text-sm">{r.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
