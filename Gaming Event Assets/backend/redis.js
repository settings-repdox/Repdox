const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redisOptions = {
  maxRetriesPerRequest: 5,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
  reconnectOnError(err) {
    return !!err;
  },
};

const client = new Redis(REDIS_URL, redisOptions);
const pub = new Redis(REDIS_URL, redisOptions);

client.on("connect", () => {
  console.log("Redis client connecting");
});

client.on("ready", () => {
  console.log("Redis client ready");
});

client.on("error", (error) => {
  console.error("Redis client error:", error.message || error);
});

client.on("close", () => {
  console.warn("Redis client connection closed");
});

pub.on("connect", () => {
  console.log("Redis publisher connecting");
});

pub.on("ready", () => {
  console.log("Redis publisher ready");
});

pub.on("error", (error) => {
  console.error("Redis publisher error:", error.message || error);
});

function parseJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
}

function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function normalizeHash(hash) {
  const normalized = {};
  for (const key in hash) {
    normalized[key] = normalizeString(hash[key]);
  }
  return normalized;
}

async function getMatchSnapshot(matchId) {
  const [state, score, timer, activeScene, activeCamera] = await Promise.all([
    client.hgetall(`match:${matchId}:state`),
    client.hgetall(`match:${matchId}:score`),
    client.get(`match:${matchId}:timer`),
    client.get(`match:${matchId}:activeScene`),
    client.get(`match:${matchId}:activeCamera`),
  ]);

  return {
    matchId,
    state: normalizeHash(state),
    score: normalizeHash(score),
    timer: timer === null ? null : Number(timer),
    activeScene: normalizeString(activeScene),
    activeCamera: normalizeString(activeCamera),
  };
}

async function getBracketSnapshot(tournamentId) {
  const raw = await client.get(`bracket:${tournamentId}`);
  return {
    tournamentId,
    bracket: parseJson(raw) || null,
  };
}

async function getSponsorsSnapshot() {
  const sponsors = await client.lrange("sponsors:rotation", 0, -1);
  return { sponsors };
}

function publish(channel, payload) {
  return pub.publish(channel, JSON.stringify(payload));
}

module.exports = {
  client,
  publish,
  getMatchSnapshot,
  getBracketSnapshot,
  getSponsorsSnapshot,
  normalizeString,
  parseJson,
};
