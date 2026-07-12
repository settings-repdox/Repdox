const matchId =
  new URLSearchParams(window.location.search).get("matchId") || "default";
const socket = new WebSocket(
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws?matchId=${encodeURIComponent(matchId)}`,
);

const timerValueEl = document.getElementById("timerValue");
const timerStateEl = document.getElementById("timerState");
let currentSeconds = 0;
let ticking = false;
let interval = null;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateDisplay(seconds) {
  currentSeconds = Number.isFinite(seconds) ? seconds : 0;
  timerValueEl.textContent = formatTime(currentSeconds);
  timerStateEl.textContent = ticking ? "live" : "paused";
}

function applySnapshot(snapshot) {
  if (snapshot.timer !== null) {
    updateDisplay(snapshot.timer);
  }
}

function handleUpdate(message) {
  const data = message.data || {};
  if (message.channel === "timer:tick") {
    const timer = Number(data.timer ?? 0);
    updateDisplay(timer);
  }
}

socket.addEventListener("open", () => {
  console.log("Timer WS connected");
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
  console.warn("Timer WS closed; retrying in 1s");
  setTimeout(() => window.location.reload(), 1000);
});

socket.addEventListener("error", () => {
  console.warn("Timer WS error");
});
