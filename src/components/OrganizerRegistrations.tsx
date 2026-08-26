import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerDefaults } from "@/core/services/registerDefaults";
import { resolveService } from "@/core/services/di";
import type { IRegistrationService } from "@/core/services/interfaces/IRegistrationService";
import type { RegistrationDTO } from "@/shared/dtos/registration.dto";
import { toast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/timeUtils";
import type { IEventService } from "@/domains/events/interfaces/IEventService";
import { Trash2 } from "lucide-react";

registerDefaults();

const registrationService = () =>
  resolveService<IRegistrationService>("RegistrationService");
const eventServiceCore = () => resolveService<IEventService>("EventService");

type RegistrationRow = RegistrationDTO;

export default function OrganizerRegistrations({
  eventId,
  eventSlug,
}: {
  eventId: string;
  eventSlug?: string | null;
}) {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [teamMap, setTeamMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "team", direction: "asc" });

  const load = async () => {
    setLoading(true);
    try {
      const regs = await registrationService().fetchEventRegistrations(
        eventId,
        eventSlug,
      );
      setRegistrations(regs);

      // Fetch team names for registrations with team_id
      const teamIds = Array.from(
        new Set(regs.map((r) => r.teamId).filter(Boolean)),
      ) as string[];
      if (teamIds.length > 0) {
        const map = await eventServiceCore().getTeamNamesByIds(teamIds);
        setTeamMap(map);
      }
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Failed to load registrations",
        description: error.message || String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (registrationId: string) => {
    if (!confirm("Are you sure you want to delete this registration?")) return;

    try {
      await registrationService().deleteEventRegistration(
        registrationId,
        eventId,
        eventSlug,
      );

      toast({
        title: "Registration deleted",
        description: "The registration has been removed successfully.",
      });

      load();
    } catch (err: any) {
      toast({
        title: "Failed to delete registration",
        description: err.message || String(err),
        variant: "destructive",
      });
    }
  };

  const getTeamName = (r: RegistrationRow) => {
    if (r.teamId && teamMap[r.teamId]) return teamMap[r.teamId];

    try {
      if (!r.message) return "-";
      const msg =
        typeof r.message === "string" ? JSON.parse(r.message) : r.message;
      return msg?.participation?.teamName || msg?.teamName || "-";
    } catch (e) {
      return "-";
    }
  };

  // CSV/Markdown export — one row per registration, mirroring the columns
  // already shown in the table below (name, team, status, registered date).
  const csvEscape = (value: unknown) => {
    const s = value === null || value === undefined ? "" : String(value);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const generateCSV = (rows: RegistrationRow[]) => {
    const header = ["Name", "Email", "Team", "Status", "Role", "Registered At"];
    const lines = rows.map((r) =>
      [r.name ?? "", r.email ?? "", getTeamName(r), r.status ?? "", r.role ?? "", r.createdAt]
        .map(csvEscape)
        .join(","),
    );
    return [header.join(","), ...lines].join("\n");
  };

  const generateMarkdown = (rows: RegistrationRow[]) => {
    const header = "| Name | Email | Team | Status | Role | Registered At |";
    const divider = "| --- | --- | --- | --- | --- | --- |";
    const mdEscape = (value: unknown) => String(value ?? "").replace(/\|/g, "\\|");
    const lines = rows.map(
      (r) =>
        `| ${mdEscape(r.name)} | ${mdEscape(r.email)} | ${mdEscape(getTeamName(r))} | ${mdEscape(r.status)} | ${mdEscape(r.role)} | ${mdEscape(formatDateTime(r.createdAt))} |`,
    );
    return [header, divider, ...lines].join("\n");
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedRegistrations = [...registrations].sort((a, b) => {
    if (!sortConfig) return 0;

    let aVal: string | number, bVal: string | number;
    if (sortConfig.key === "team") {
      aVal = getTeamName(a).toLowerCase();
      bVal = getTeamName(b).toLowerCase();
    } else if (sortConfig.key === "created_at") {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    } else {
      const key = sortConfig.key as keyof RegistrationRow;
      aVal = String(a[key] || "").toLowerCase();
      bVal = String(b[key] || "").toLowerCase();
    }

    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    if (eventId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleExport = (format: "csv" | "md") => {
    try {
      let payload = "";
      if (format === "csv") payload = generateCSV(registrations);
      else payload = generateMarkdown(registrations);

      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations-${eventId}.${format === "csv" ? "csv" : "md"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Export failed",
        description: error.message || String(error),
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
            {loading
              ? "Loading..."
              : `${registrations.length} registrations found`}
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
                  const text = generateCSV(registrations);
                  await navigator.clipboard.writeText(text);
                  toast({
                    title: "Copied",
                    description: "CSV copied to clipboard",
                  });
                } catch (err) {
                  const error = err as Error;
                  toast({
                    title: "Copy failed",
                    description: error.message || String(error),
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
                  const text = generateMarkdown(registrations);
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
                  toast({
                    title: "Not implemented",
                    description:
                      "XLSX export will be added in a future release.",
                  });
                } catch (err: any) {
                  toast({
                    title: "Export failed",
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

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-separate border-spacing-0">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left pb-3 w-12">Sr No</th>
                <th
                  className="text-left pb-3 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("created_at")}
                >
                  Time{" "}
                  {sortConfig?.key === "created_at" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-left pb-3 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("name")}
                >
                  Name{" "}
                  {sortConfig?.key === "name" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-left pb-3 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("team")}
                >
                  Team{" "}
                  {sortConfig?.key === "team" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left pb-3">Email</th>
                <th className="text-left pb-3">Phone</th>
                <th className="text-left pb-3">Role</th>
                <th className="text-left pb-3">Status</th>
                <th className="text-right pb-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRegistrations.map((r, index) => (
                <tr
                  key={r.id}
                  className="border-t border-border/50 hover:bg-accent/5 transition-colors"
                >
                  <td className="py-3 text-xs text-muted-foreground font-medium">
                    {index + 1}
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td className="py-3 font-medium">{r.name}</td>
                  <td className="py-3">
                    {getTeamName(r) !== "-" ? (
                      <span className="inline-block px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-sm font-bold border border-purple-500/20 whitespace-nowrap uppercase tracking-tight">
                        {getTeamName(r)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {r.email}
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {r.phone}
                  </td>
                  <td className="py-3 text-sm">
                    <span className="capitalize">{r.role || "-"}</span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === "registered"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {r.status || "-"}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
