
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function syncTeams() {
  console.log("Starting team sync...");
  
  // 1. Fetch all registrations for SolveForIndia that don't have a team_id yet
  const { data: registrations, error: regError } = await supabase
    .from('event_registrations')
    .select('id, event_id, message, team_id')
    .is('team_id', null);

  if (regError) {
    console.error("Error fetching registrations:", regError);
    return;
  }

  for (const reg of registrations) {
    try {
      const msg = typeof reg.message === 'string' ? JSON.parse(reg.message) : reg.message;
      const teamInfo = msg.participation || msg; // Handle both structures

      if (teamInfo && teamInfo.teamName) {
        console.log(`Processing team: ${teamInfo.teamName}`);
        
        // 2. See if team already exists
        let { data: team } = await supabase
          .from('event_teams')
          .select('id')
          .eq('event_id', reg.event_id)
          .ilike('name', teamInfo.teamName)
          .maybeSingle();

        if (!team) {
          // 3. Create it if it doesn't exist
          console.log(`Creating team record for: ${teamInfo.teamName}`);
          const { data: newTeam, error: createError } = await supabase
            .from('event_teams')
            .insert([{
              event_id: reg.event_id,
              name: teamInfo.teamName,
              max_members: parseInt(teamInfo.expectedMembers || 4)
            }])
            .select()
            .single();
          
          if (createError) throw createError;
          team = newTeam;
        }

        // 4. Link registration to team
        if (team) {
          await supabase
            .from('event_registrations')
            .update({ team_id: team.id })
            .eq('id', reg.id);
          console.log(`Linked registration ${reg.id} to team ${team.id}`);
        }
      }
    } catch (e) {
      console.warn(`Skipping registration ${reg.id}:`, e.message);
    }
  }
  console.log("Sync complete!");
}

syncTeams();
