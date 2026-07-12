const express = require("express");
const {
  client,
  publish,
  getMatchSnapshot,
  getBracketSnapshot,
  getSponsorsSnapshot,
  parseJson,
} = require("../redis");
const {
  syncMatchStateToSupabase,
  syncMatchScoreToSupabase,
} = require("../supabaseSync");

const router = express.Router();
const ADMIN_TOKEN = process.env.ADMIN_BEARER_TOKEN || "repdox-admin-token";

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  if (
    !authorization.startsWith("Bearer ") ||
    authorization.slice(7) !== ADMIN_TOKEN
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/match/:matchId/snapshot", async (req, res) => {
  try {
    const snapshot = await getMatchSnapshot(req.params.matchId);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch match snapshot" });
  }
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
  const data = {
    teamAScore: String(payload.teamAScore ?? "0"),
    teamBScore: String(payload.teamBScore ?? "0"),
    roundNumber: String(payload.roundNumber ?? "0"),
  };

  try {
    await client.hset(`match:${req.params.matchId}:score`, data);
    await publish("score:update", { matchId: req.params.matchId, score: data });
    void syncMatchScoreToSupabase(req.params.matchId, data);
    res.json({ ok: true, score: data });
  } catch (error) {
    res.status(500).json({ error: "Unable to update score" });
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
    await client.hset(`match:${req.params.matchId}:state`, data);
    await publish("match:status", { matchId: req.params.matchId, state: data });
    res.json({ ok: true, lowerThird: data });
  } catch (error) {
    res.status(500).json({ error: "Unable to update lower third" });
  }
});
router.post("/match/:matchId/timer", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const seconds = Number(payload.secondsRemaining ?? 0);
  if (Number.isNaN(seconds) || seconds < 0) {
    return res.status(400).json({ error: "Invalid secondsRemaining" });
  }

  try {
    await client.set(`match:${req.params.matchId}:timer`, String(seconds));
    await publish("timer:tick", {
      matchId: req.params.matchId,
      timer: seconds,
    });
    res.json({ ok: true, timer: seconds });
  } catch (error) {
    res.status(500).json({ error: "Unable to update timer" });
  }
});

router.post("/match/:matchId/scene", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const scene = String(payload.activeScene || payload.scene || "");
  if (!scene) {
    return res.status(400).json({ error: "Missing activeScene" });
  }

  try {
    await client.set(`match:${req.params.matchId}:activeScene`, scene);
    await publish("scene:change", {
      matchId: req.params.matchId,
      activeScene: scene,
    });
    res.json({ ok: true, activeScene: scene });
  } catch (error) {
    res.status(500).json({ error: "Unable to update scene" });
  }
});

router.post("/match/:matchId/camera", requireAuth, async (req, res) => {
  const payload = req.body || {};
  const camera = String(payload.activeCamera || "");
  if (!camera) {
    return res.status(400).json({ error: "Missing activeCamera" });
  }

  try {
    await client.set(`match:${req.params.matchId}:activeCamera`, camera);
    await publish("match:status", {
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
    await client.del("sponsors:rotation");
    await client.rpush("sponsors:rotation", ...sponsors);
    await publish("sponsor:rotate", { sponsors });
    res.json({ ok: true, sponsors });
  } catch (error) {
    res.status(500).json({ error: "Unable to update sponsors" });
  }
});

module.exports = router;
