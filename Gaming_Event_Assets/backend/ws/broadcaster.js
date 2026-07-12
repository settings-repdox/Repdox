const WebSocket = require("ws");
const Redis = require("ioredis");
const {
  getMatchSnapshot,
  getBracketSnapshot,
  getSponsorsSnapshot,
} = require("../redis");

const CHANNELS = [
  "score:update",
  "timer:tick",
  "scene:change",
  "bracket:update",
  "sponsor:rotate",
  "match:status",
];

function safeSend(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    console.warn("WebSocket send failed", error.message);
  }
}

function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ server, path: "/ws" });
  const redisOptions = {
    maxRetriesPerRequest: 5,
    retryStrategy(times) {
      return Math.min(times * 200, 2000);
    },
    reconnectOnError(err) {
      return !!err;
    },
  };
  const sub = new Redis(
    process.env.REDIS_URL || "redis://localhost:6379",
    redisOptions,
  );
  sub.on("connect", () => {
    console.log("Redis subscriber connecting");
  });
  sub.on("ready", () => {
    console.log("Redis subscriber ready");
  });
  sub.on("error", (error) => {
    console.error("Redis subscriber error:", error.message || error);
  });
  sub.on("close", () => {
    console.warn("Redis subscriber connection closed");
  });
  sub.subscribe(...CHANNELS).catch((error) => {
    console.error("WS subscriber failed to subscribe:", error.message);
  });

  sub.on("message", (channel, rawPayload) => {
    let payload;
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      payload = { raw: rawPayload };
    }

    const frame = {
      channel,
      timestamp: Date.now(),
      data: payload,
      matchId: payload.matchId || payload.match_id || null,
    };

    wss.clients.forEach((socket) => {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }
      if (socket.subscriptions && socket.subscriptions.has(channel)) {
        safeSend(socket, frame);
      }
    });
  });

  wss.on("connection", async (socket, req) => {
    socket.subscriptions = new Set(CHANNELS);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const matchId = url.searchParams.get("matchId");
    const tournamentId = url.searchParams.get("tournamentId");
    const snapshotMode = url.searchParams.get("snapshot") !== "false";

    if (snapshotMode) {
      if (matchId) {
        const matchSnapshot = await getMatchSnapshot(matchId);
        safeSend(socket, {
          type: "snapshot",
          channel: "match:snapshot",
          data: matchSnapshot,
        });
      }
      if (tournamentId) {
        const bracketSnapshot = await getBracketSnapshot(tournamentId);
        const sponsorSnapshot = await getSponsorsSnapshot();
        safeSend(socket, {
          type: "snapshot",
          channel: "bracket:snapshot",
          data: bracketSnapshot,
        });
        safeSend(socket, {
          type: "snapshot",
          channel: "sponsors:snapshot",
          data: sponsorSnapshot,
        });
      }
    }

    socket.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage);
        if (message.type === "subscribe" && Array.isArray(message.channels)) {
          socket.subscriptions = new Set(
            message.channels.filter((channel) => CHANNELS.includes(channel)),
          );
          safeSend(socket, {
            type: "subscribed",
            channels: Array.from(socket.subscriptions),
          });
          return;
        }
        if (message.type === "snapshot" && message.matchId) {
          getMatchSnapshot(message.matchId).then((matchSnapshot) => {
            safeSend(socket, {
              type: "snapshot",
              channel: "match:snapshot",
              data: matchSnapshot,
            });
          });
        }
      } catch (e) {
        safeSend(socket, { type: "error", message: "Invalid message format" });
      }
    });

    socket.on("close", () => {
      socket.subscriptions = null;
    });
  });

  return wss;
}

module.exports = { createWebSocketServer };
