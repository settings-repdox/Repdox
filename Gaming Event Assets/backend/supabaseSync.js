const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[Supabase Sync] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Supabase sync will be disabled.",
  );
}

const supabase = SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function normalizeString(value) {
  if (value === undefined || value === null) return null;
  return String(value);
}

async function syncMatchStateToSupabase(matchId, state) {
  if (!supabase) return;

  const updatePayload = {
    id: matchId,
    match_status: normalizeString(state.status) || undefined,
    team_a_score: toNumberOrNull(state.seriesScoreA),
    team_b_score: toNumberOrNull(state.seriesScoreB),
    updated_at: new Date().toISOString(),
  };

  // Remove undefined values to avoid overwriting with null for fields not present.
  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  if (Object.keys(updatePayload).length <= 1) {
    return;
  }

  try {
    await supabase
      .from("esports_tournament_matches")
      .upsert(updatePayload, { onConflict: ["id"] });
  } catch (error) {
    console.error(
      "[Supabase Sync] Failed to sync match state for",
      matchId,
      error,
    );
  }
}

async function syncMatchScoreToSupabase(matchId, score) {
  if (!supabase) return;

  const matchPayload = {
    id: matchId,
    team_a_score: toNumberOrNull(score.teamAScore),
    team_b_score: toNumberOrNull(score.teamBScore),
    updated_at: new Date().toISOString(),
  };

  const mapPayload = {
    match_id: matchId,
    map_order: toNumberOrNull(score.roundNumber) || 1,
    team_a_score: toNumberOrNull(score.teamAScore),
    team_b_score: toNumberOrNull(score.teamBScore),
    map_status: "live",
    updated_at: new Date().toISOString(),
  };

  try {
    await Promise.all([
      supabase
        .from("esports_tournament_matches")
        .upsert(matchPayload, { onConflict: ["id"] }),
      supabase.from("esports_tournament_maps").upsert(mapPayload, {
        onConflict: ["match_id", "map_order"],
      }),
    ]);
  } catch (error) {
    console.error("[Supabase Sync] Failed to sync score for", matchId, error);
  }
}

module.exports = {
  syncMatchStateToSupabase,
  syncMatchScoreToSupabase,
};
