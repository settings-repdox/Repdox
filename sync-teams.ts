import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Helper to load env variables from .env file
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        // Remove null characters (in case of UTF-16LE append issues)
        const cleanLine = line.replace(/\x00/g, '');
        const match = cleanLine.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          // Take first word in case of garbage space-separated trailing stuff
          value = value.split(/\s+/)[0];
          if (!process.env[key]) {
            process.env[key] = value.trim();
          }
        }
      });
    }
  } catch (err) {
    console.warn("Failed to load .env file:", err);
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use service role key if available (necessary for updates on some tables if RLS is enabled)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getRegistrationTableName(event: { slug?: string | null, id?: string | null }) {
  if (event.slug) {
    let formattedSlug = event.slug.toLowerCase().replace(/[- ]/g, "_");
    // Prevent 404 errors by mapping the 2026 slug to the actual database table name
    if (formattedSlug === "solveforindia2026") {
      formattedSlug = "solveforindia";
    }
    return `event_reg_${formattedSlug}`;
  }
  if (event.id) {
    return `event_reg_${event.id.replace(/-/g, "_")}`;
  }
  return "event_registrations";
}

async function syncTeams() {
  console.log("Starting team sync...");

  // 1. Fetch all events
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, slug, title');

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
    return;
  }

  console.log(`Found ${events.length} events to check.`);

  for (const event of events) {
    console.log(`\n--- Syncing teams for event: ${event.title} (${event.slug}) ---`);
    
    // Fetch all existing teams for this event
    const { data: teams, error: teamsError } = await supabase
      .from('event_teams')
      .select('*')
      .eq('event_id', event.id);

    if (teamsError) {
      console.error(`Error fetching teams for event ${event.title}:`, teamsError);
      continue;
    }

    const teamMap = new Map();
    teams?.forEach(t => {
      teamMap.set(t.name.trim().toLowerCase(), t);
    });

    // 2. Identify the registration tables to check
    const dynamicTable = getRegistrationTableName(event);
    const tablesToCheck = ['event_registrations'];
    if (dynamicTable && dynamicTable !== 'event_registrations') {
      tablesToCheck.unshift(dynamicTable);
    }

    for (const tableName of tablesToCheck) {
      try {
        // Query registrations where team_id is null
        const { data: registrations, error: regError } = await supabase
          .from(tableName as any)
          .select('id, event_id, message, team_id, name')
          .eq('event_id', event.id)
          .is('team_id', null);

        if (regError) {
          // If table doesn't exist, we'll get an error, which is expected for some events
          if (regError.message.includes("does not exist")) {
            continue;
          }
          console.warn(`Error fetching from ${tableName}:`, regError.message);
          continue;
        }

        if (!registrations || registrations.length === 0) {
          continue;
        }

        console.log(`Found ${registrations.length} registrations with null team_id in table ${tableName}`);

        for (const reg of registrations) {
          if (!reg.message) continue;

          try {
            const msg = typeof reg.message === 'string' ? JSON.parse(reg.message) : reg.message;
            const teamInfo = msg.participation || msg;

            if (teamInfo && teamInfo.teamName) {
              const cleanTeamName = teamInfo.teamName.trim();
              if (!cleanTeamName) continue;

              const normalized = cleanTeamName.toLowerCase();
              let team = teamMap.get(normalized);

              // Create team if it does not exist
              if (!team) {
                console.log(`Creating team: "${cleanTeamName}" for event ${event.title}`);
                const { data: newTeam, error: createError } = await supabase
                  .from('event_teams')
                  .insert([{
                    event_id: event.id,
                    name: cleanTeamName,
                    max_members: parseInt(teamInfo.expectedMembers || 4)
                  }])
                  .select()
                  .single();

                if (createError) {
                  console.error(`Failed to create team "${cleanTeamName}":`, createError.message);
                  continue;
                }
                team = newTeam;
                teamMap.set(normalized, team);
              }

              if (team) {
                // Link in current table
                const { error: updateError } = await supabase
                  .from(tableName as any)
                  .update({ team_id: team.id })
                  .eq('id', reg.id);

                if (updateError) {
                  console.error(`Failed to link registration ${reg.name} in ${tableName}:`, updateError.message);
                } else {
                  console.log(`Linked registration ${reg.name} to team ${team.name} in ${tableName}`);
                }

                // If this is the dynamic table, also try to update central event_registrations
                if (tableName !== 'event_registrations') {
                  const { error: centralUpdateError } = await supabase
                    .from('event_registrations')
                    .update({ team_id: team.id })
                    .eq('id', reg.id);
                  
                  if (!centralUpdateError) {
                    console.log(`Linked registration ${reg.name} in central event_registrations as well`);
                  }
                }
              }
            }
          } catch (e: any) {
            // Quietly skip JSON parsing errors for simple string messages
          }
        }
      } catch (err: any) {
        console.error(`Unexpected error processing table ${tableName}:`, err.message);
      }
    }
  }
  console.log("\nSync complete!");
}

syncTeams();
