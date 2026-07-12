const API_BASE = "/api";
const matchId =
  new URLSearchParams(window.location.search).get("matchId") || "default";
const token = "repdox-admin-token";

const elements = {
  scoreA: document.getElementById("scoreA"),
  scoreB: document.getElementById("scoreB"),
  timerInput: document.getElementById("timerInput"),
  timerSet: document.getElementById("timerSet"),
  timerReset: document.getElementById("timerReset"),
  connectionState: document.getElementById("connectionState"),
  sponsorInput: document.getElementById("sponsorInput"),
};

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function setConnectionState(online) {
  elements.connectionState.textContent = online ? "Online" : "Offline";
  elements.connectionState.style.background = online
    ? "rgba(78,168,255,0.14)"
    : "rgba(232,84,84,0.14)";
}

async function fetchSnapshot() {
  try {
    const response = await fetch(`${API_BASE}/match/${matchId}/snapshot`);
    const data = await response.json();
    elements.scoreA.textContent = data.score.teamAScore || "0";
    elements.scoreB.textContent = data.score.teamBScore || "0";
    setConnectionState(true);
  } catch (error) {
    setConnectionState(false);
  }
}

async function sendUpdate(path, payload) {
  try {
    const response = await fetch(`${API_BASE}/${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Request failed");
    }
    await fetchSnapshot();
  } catch (error) {
    console.error(error);
    setConnectionState(false);
  }
}

document.querySelectorAll("button[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const team = button.dataset.team;
    const isIncrement = button.dataset.action === "increment";
    const valueEl = team === "A" ? elements.scoreA : elements.scoreB;
    const value = Number(valueEl.textContent || "0");
    const newValue = Math.max(0, value + (isIncrement ? 1 : -1));
    const payload = {
      teamAScore:
        team === "A" ? newValue : Number(elements.scoreA.textContent || 0),
      teamBScore:
        team === "B" ? newValue : Number(elements.scoreB.textContent || 0),
      roundNumber: 0,
    };
    sendUpdate(`match/${matchId}/score`, payload);
  });
});

elements.timerSet.addEventListener("click", () => {
  const seconds = Number(elements.timerInput.value || 0);
  sendUpdate(`match/${matchId}/timer`, { secondsRemaining: seconds });
});

elements.timerReset.addEventListener("click", () => {
  sendUpdate(`match/${matchId}/timer`, { secondsRemaining: 0 });
});

document.querySelectorAll("button[data-scene]").forEach((button) => {
  button.addEventListener("click", () => {
    sendUpdate(`match/${matchId}/scene`, { activeScene: button.dataset.scene });
  });
});

document.querySelectorAll("button[data-camera]").forEach((button) => {
  button.addEventListener("click", () => {
    sendUpdate(`match/${matchId}/camera`, {
      activeCamera: button.dataset.camera,
    });
  });
});

elements.sponsorInput.addEventListener("change", () => {
  const sponsors = elements.sponsorInput.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (sponsors.length) {
    sendUpdate("sponsors/rotation", { sponsors });
  }
});

fetchSnapshot();
