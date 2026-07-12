const matchId =
  new URLSearchParams(window.location.search).get("matchId") || "default";
const socket = new WebSocket(
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws?matchId=${encodeURIComponent(matchId)}`,
);

const elements = {
  mapNumber: document.getElementById("mapNumber"),
  matchStatus: document.getElementById("matchStatus"),
  teamAScore: document.getElementById("teamAScore"),
  teamBScore: document.getElementById("teamBScore"),
  roundNumber: document.getElementById("roundNumber"),
  seriesScoreA: document.getElementById("seriesScoreA"),
  seriesScoreB: document.getElementById("seriesScoreB"),
};

function setText(el, value, fallback) {
  if (!el) return;
  el.textContent =
    value !== undefined && value !== null && value !== "" ? value : fallback;
}

function applySnapshot(snapshot) {
  setText(elements.mapNumber, snapshot.state.mapNumber, "1");
  setText(elements.matchStatus, snapshot.state.status || "Pending");
  setText(elements.teamAScore, snapshot.score.teamAScore, "0");
  setText(elements.teamBScore, snapshot.score.teamBScore, "0");
  setText(elements.roundNumber, snapshot.score.roundNumber, "0");
  setText(elements.seriesScoreA, snapshot.state.seriesScoreA, "0");
  setText(elements.seriesScoreB, snapshot.state.seriesScoreB, "0");
}

function handleUpdate(message) {
  const data = message.data || {};
  if (message.channel === "score:update") {
    setText(elements.teamAScore, data.score?.teamAScore, "0");
    setText(elements.teamBScore, data.score?.teamBScore, "0");
    setText(elements.roundNumber, data.score?.roundNumber, "0");
    return;
  }
  if (message.channel === "match:status") {
    setText(elements.mapNumber, data.state?.mapNumber, "1");
    setText(elements.matchStatus, data.state?.status || "Pending");
    setText(elements.seriesScoreA, data.state?.seriesScoreA, "0");
    setText(elements.seriesScoreB, data.state?.seriesScoreB, "0");
    return;
  }
}

socket.addEventListener("open", () => {
  console.log("Scoreboard WS connected");
  socket.send(JSON.stringify({ type: "snapshot", matchId }));
});

socket.addEventListener("message", (event) => {
  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch (error) {
    return;
  }

  if (payload.type === "snapshot" && payload.channel === "match:snapshot") {
    applySnapshot(payload.data);
    return;
  }
  if (payload.type === "update") {
    handleUpdate(payload);
    return;
  }
});

socket.addEventListener("close", () => {
  console.warn("Scoreboard WS closed; retrying in 1s");
  setTimeout(() => window.location.reload(), 1000);
});

socket.addEventListener("error", () => {
  console.warn("Scoreboard WS error");
});
