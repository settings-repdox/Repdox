const express = require("express");
const {
  client,
  publish,
  getMatchSnapshot,
  getBracketSnapshot,
  getSponsorsSnapshot,
} = require("../redis");
const requireAuth = require("../middleware/auth");
const {
  syncMatchStateToSupabase,
  syncMatchScoreToSupabase,
  checkSupabaseHealth,
} = require("../supabaseSync");

const router = express.Router();

router.get("/match/:matchId/snapshot", async (req, res) => {
  try {
    const snapshot = await getMatchSnapshot(req.params.matchId);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch match snapshot" });
  }
});

router.get("/health", async (req, res) => {
  let redisOk = true;
  let supabaseOk = true;
  let supabaseError = null;

  try {
    await client.ping();
  } catch (error) {
    redisOk = false;
  }

  try {
    await checkSupabaseHealth();
  } catch (error) {
    supabaseOk = false;
    supabaseError = error?.message || String(error);
  }

  const status = redisOk && supabaseOk ? 200 : 503;
  res.status(status).json({
    ok: redisOk && supabaseOk,
    redis: redisOk,
    supabase: supabaseOk,
    supabaseError,
  });
});

router.get("/bracket/:tournamentId", async (req, res) => {
  try {
    res.json(await getBracketSnapshot(req.params.tournamentId));
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch bracket" });
  }
});

router.get("/sponsors/rotation", async (req, res) => {
  try {
    res.json(await getSponsorsSnapshot());
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch sponsors" });
  }
});

router.post("/match/:matchId/state", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const data = {
    status: payload.status || "pending",
    mapNumber: String(payload.mapNumber || "1"),
    seriesScoreA: String(payload.seriesScoreA || "0"),
    seriesScoreB: String(payload.seriesScoreB || "0"),
    teamA: String(payload.teamA || "Team A"),
    teamB: String(payload.teamB || "Team B"),
  };

  try {
    console.log("[match state]", req.params.matchId, data);
    await client.hset(`match:${req.params.matchId}:state`, data);
    await publish("match:status", { matchId: req.params.matchId, state: data });
    void syncMatchStateToSupabase(req.params.matchId, data);
    res.json({ ok: true, state: data });
  } catch (error) {
    res.status(500).json({ error: "Unable to update match state" });
  }
});

router.post("/match/:matchId/score", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const teamAScore = Number(payload.teamAScore ?? 0);
  const teamBScore = Number(payload.teamBScore ?? 0);
  const roundNumber = Number(payload.roundNumber ?? 0);

  if (
    !Number.isInteger(teamAScore) ||
    !Number.isInteger(teamBScore) ||
    !Number.isInteger(roundNumber) ||
    roundNumber < 0 ||
    teamAScore < 0 ||
    teamBScore < 0
  ) {
    return res.status(400).json({ error: "Invalid score payload" });
  }

  const data = {
    teamAScore: String(teamAScore),
    teamBScore: String(teamBScore),
    roundNumber: String(roundNumber),
  };

  try {
    console.log("[score update]", req.params.matchId, data);
    await client.hset(`match:${req.params.matchId}:score`, data);
    await publish("score:update", { matchId: req.params.matchId, score: data });
    void syncMatchScoreToSupabase(req.params.matchId, data);
    res.json({ ok: true, score: data });
  } catch (error) {
    res.status(500).json({ error: "Unable to update score" });
  }
});

router.post("/match/:matchId/status", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const status = String(payload.status || "").trim();
  const validStatuses = ["upcoming", "live", "halftime", "paused", "completed"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid match status" });
  }

  const data = { status };
  try {
    console.log("[match status]", req.params.matchId, status);
    await client.hset(`match:${req.params.matchId}:state`, data);
    await publish("match:status", {
      matchId: req.params.matchId,
      status,
    });
    void syncMatchStateToSupabase(req.params.matchId, data);
    res.json({ ok: true, status });
  } catch (error) {
    res.status(500).json({ error: "Unable to update match status" });
  }
});

router.post("/match/:matchId/lower-third", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const data = {
    lowerThirdName: String(payload.name || "Player Name"),
    lowerThirdRole: String(payload.role || "Role"),
    lowerThirdType: String(payload.type || "player"),
  };

  try {
    console.log("[lower third]", req.params.matchId, data);
    await client.hset(`match:${req.params.matchId}:state`, data);
    await publish("match:status", { matchId: req.params.matchId, state: data });
    res.json({ ok: true, lowerThird: data });
  } catch (error) {
    res.status(500).json({ error: "Unable to update lower third" });
  }
});
router.post("/match/:matchId/timer", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const action = String(payload.action || "").trim();
  const validActions = ["start", "pause", "reset"];

  if (!validActions.includes(action)) {
    return res.status(400).json({ error: "Invalid timer action" });
  }

  const rawSeconds =
    payload.seconds !== undefined ? payload.seconds : payload.secondsRemaining;
  const seconds = rawSeconds === undefined ? null : Number(rawSeconds);
  if (rawSeconds !== undefined && (Number.isNaN(seconds) || seconds < 0)) {
    return res.status(400).json({ error: "Invalid seconds value" });
  }

  const timerValue = action === "reset" ? 0 : (seconds ?? 0);

  try {
    console.log("[timer]", req.params.matchId, action, timerValue);
    await client.set(`match:${req.params.matchId}:timer`, String(timerValue));
    await publish("timer:tick", {
      matchId: req.params.matchId,
      action,
      seconds: timerValue,
    });
    res.json({ ok: true, action, seconds: timerValue });
  } catch (error) {
    res.status(500).json({ error: "Unable to update timer" });
  }
});

router.post("/match/:matchId/scene", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const scene = String(payload.activeScene || payload.scene || "").trim();
  const activeCamera = payload.activeCamera;

  if (!scene) {
    return res.status(400).json({ error: "Missing activeScene" });
  }

  try {
    console.log("[scene]", req.params.matchId, scene, activeCamera);
    await client.set(`match:${req.params.matchId}:activeScene`, scene);
    if (activeCamera !== undefined && activeCamera !== null) {
      await client.set(
        `match:${req.params.matchId}:activeCamera`,
        String(activeCamera),
      );
    }
    await publish("scene:change", {
      matchId: req.params.matchId,
      activeScene: scene,
      activeCamera:
        activeCamera !== undefined ? String(activeCamera) : undefined,
    });
    void syncMatchStateToSupabase(req.params.matchId, {
      activeScene: scene,
      activeCamera:
        activeCamera !== undefined ? String(activeCamera) : undefined,
    });
    res.json({ ok: true, activeScene: scene, activeCamera });
  } catch (error) {
    res.status(500).json({ error: "Unable to update scene" });
  }
});

router.post("/match/:matchId/camera", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const camera = String(payload.activeCamera || "").trim();
  if (!camera) {
    return res.status(400).json({ error: "Missing activeCamera" });
  }

  try {
    console.log("[camera]", req.params.matchId, camera);
    await client.set(`match:${req.params.matchId}:activeCamera`, camera);
    await publish("scene:change", {
      matchId: req.params.matchId,
      activeCamera: camera,
    });
    res.json({ ok: true, activeCamera: camera });
  } catch (error) {
    res.status(500).json({ error: "Unable to update active camera" });
  }
});

router.post("/bracket/:tournamentId", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const bracket = payload.bracket;
  if (!bracket) {
    return res.status(400).json({ error: "Missing bracket payload" });
  }

  try {
    console.log("[bracket update]", req.params.tournamentId);
    await client.set(
      `bracket:${req.params.tournamentId}`,
      JSON.stringify(bracket),
    );
    await publish("bracket:update", {
      tournamentId: req.params.tournamentId,
      bracket,
    });
    res.json({ ok: true, bracket });
  } catch (error) {
    res.status(500).json({ error: "Unable to update bracket" });
  }
});

router.post("/sponsors/rotation", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const sponsors = Array.isArray(payload.sponsors)
    ? payload.sponsors.map(String)
    : [];
  if (!sponsors.length) {
    return res
      .status(400)
      .json({ error: "Sponsors must be a non-empty array" });
  }

  try {
    console.log("[sponsor rotation]", sponsors.length);
    await client.del("sponsors:rotation");
    await client.rpush("sponsors:rotation", ...sponsors);
    await publish("sponsor:rotate", { sponsors });
    res.json({ ok: true, sponsors });
  } catch (error) {
    res.status(500).json({ error: "Unable to update sponsors" });
  }
});

module.exports = router;
