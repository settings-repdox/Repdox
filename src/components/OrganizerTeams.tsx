import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRegistrationTableName } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type Registration = {
  id: string;
  name: string | null;
  email: string | null;
  user_id: string | null;
  message: string | null;
  team_id: string | null;
};

type TeamMember = Registration;

type Team = Database["public"]["Tables"]["event_teams"]["Row"] & {
  members: TeamMember[];
};

export default function OrganizerTeams({ eventId, eventSlug }: { eventId: string; eventSlug?: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamsAndMembers = async () => {
      setLoading(true);
      try {
        // Fetch raw teams
        const { data: rawTeams, error: teamsError } = await supabase
          .from("event_teams")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: true });

        if (teamsError) throw teamsError;

        // Fetch registrations
        const tableName = getRegistrationTableName({ id: eventId, slug: eventSlug });
        let allRegs: Registration[] = [];
        
        const { data: regsData } = await supabase
          .from(tableName as "event_registrations")
          .select("id, name, email, user_id, message, team_id")
          .eq("event_id", eventId);
          
        if (regsData) {
          allRegs = (regsData as Registration[]).map(r => r);
        }

        if (tableName !== "event_registrations") {
          const { data: fallbackData } = await supabase
            .from("event_registrations")
            .select("id, name, email, user_id, message, team_id")
            .eq("event_id", eventId);
          if (fallbackData) {
            allRegs = [...allRegs, ...(fallbackData as Registration[])];
          }
        }

        // Group teams
        const groupedTeamsMap = new Map<string, Team>();
        
        (rawTeams || []).forEach(team => {
          const lowerName = team.name.toLowerCase();
          const members = allRegs.filter(r => {
            if (r.team_id && r.team_id === team.id) return true;
            try {
              const msg = typeof r.message === 'string' ? JSON.parse(r.message) : r.message;
              const teamName = msg?.participation?.teamName || msg?.teamName;
              return teamName && teamName.toLowerCase() === lowerName;
            } catch (e) {
              return false;
            }
          });

          if (groupedTeamsMap.has(lowerName)) {
            const existing = groupedTeamsMap.get(lowerName);
            const allMembers = [...existing.members, ...members];
            existing.members = Array.from(new Map(allMembers.map(m => [m.user_id || m.email || m.id, m])).values());
          } else {
            groupedTeamsMap.set(lowerName, { 
              ...team, 
              members: Array.from(new Map(members.map(m => [m.user_id || m.email || m.id, m])).values())
            });
          }
        });

        const groupedTeams = Array.from(groupedTeamsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setTeams(groupedTeams);
      } catch (err) {
        console.error("Failed to load teams:", err);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadTeamsAndMembers();
    }
  }, [eventId, eventSlug]);

  if (loading) {
    return <div className="p-4 text-muted-foreground text-sm">Loading teams...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams</CardTitle>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No teams listed for this event.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((t) => (
              <div key={t.id} className="border border-border/50 bg-accent/5 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-lg text-accent">{t.name}</div>
                  <Badge variant="outline" className="text-xs">
                    {t.members?.length || 0} members
                  </Badge>
                </div>
                
                {t.description && (
                  <div className="text-sm text-muted-foreground italic">
                    "{t.description}"
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Users className="w-3 h-3" /> Team Members
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.members && t.members.length > 0 ? (
                      t.members.map((m) => (
                        <Badge key={m.id} variant="secondary" className="bg-background/50">
                          {m.name || m.email || "Unknown"}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No members found</span>
                    )}
                  </div>
                </div>
                
                {t.contact_email && (
                  <div className="pt-2 text-xs text-muted-foreground border-t border-border/30">
                    Contact: {t.contact_email}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
