import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import eventService, { RegistrationRow } from "@/lib/eventService";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/timeUtils";
import { supabase } from "@/integrations/supabase/client";

export default function OrganizerRegistrations({
  eventId,
  eventSlug,
}: {
  eventId: string;
  eventSlug?: string | null;
}) {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [teamMap, setTeamMap] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'team', direction: 'asc' });

  const load = async () => {
    setLoading(true);
    try {
      const regs = await eventService.fetchEventRegistrations(eventId, eventSlug);
      setRegistrations(regs);
      setCounts(await eventService.countRegistrationsByRole(eventId, eventSlug));

      // Fetch team names for registrations with team_id
      const teamIds = Array.from(new Set(regs.map(r => r.team_id).filter(Boolean))) as string[];
      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from("event_teams")
          .select("id, name")
          .in("id", teamIds);
        
        if (teams) {
          const map: Record<string, string> = {};
          teams.forEach(t => map[t.id] = t.name);
          setTeamMap(map);
        }
      }
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

  const getTeamName = (r: RegistrationRow) => {
    if (r.team_id && teamMap[r.team_id]) return teamMap[r.team_id];
    
    try {
      if (!r.message) return "-";
      const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
      return msg?.participation?.teamName || msg?.teamName || "-";
    } catch (e) {
      return "-";
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRegistrations = [...registrations].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aVal: any, bVal: any;
    if (sortConfig.key === 'team') {
      aVal = getTeamName(a).toLowerCase();
      bVal = getTeamName(b).toLowerCase();
    } else if (sortConfig.key === 'created_at') {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    } else {
      aVal = String((a as any)[sortConfig.key] || "").toLowerCase();
      bVal = String((b as any)[sortConfig.key] || "").toLowerCase();
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-sm text-muted-foreground font-medium">
            {loading ? "Loading..." : `${registrations.length} registrations found`}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
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
          <table className="w-full table-auto border-separate border-spacing-0">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left pb-3 w-12">Sr No</th>
                <th 
                  className="text-left pb-3 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  Time {sortConfig?.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="text-left pb-3 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="text-left pb-3 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('team')}
                >
                  Team {sortConfig?.key === 'team' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left pb-3">Email</th>
                <th className="text-left pb-3">Phone</th>
                <th className="text-left pb-3">Role</th>
                <th className="text-left pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRegistrations.map((r, index) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-accent/5 transition-colors">
                  <td className="py-3 text-xs text-muted-foreground font-medium">
                    {index + 1}
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="py-3 font-medium">{r.name}</td>
                  <td className="py-3">
                    <span className="inline-block px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-sm font-bold border border-purple-500/20 whitespace-nowrap uppercase tracking-tight">
                      {getTeamName(r)}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">{r.email}</td>
                  <td className="py-3 text-sm text-muted-foreground">{r.phone}</td>
                  <td className="py-3 text-sm">
                    <span className="capitalize">{r.role || "-"}</span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      r.status === 'registered' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {r.status || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
