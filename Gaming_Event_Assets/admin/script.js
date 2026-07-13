const API_BASE = "/api";
const tokenStorageKey = "repdoxAdminToken";
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("matchId") || "default";
const tournamentId = urlParams.get("tournamentId") || "";

const elements = {
  tokenInput: document.getElementById("tokenInput"),
  saveToken: document.getElementById("saveToken"),
  clearToken: document.getElementById("clearToken"),
  tokenStatus: document.getElementById("tokenStatus"),
  tokenError: document.getElementById("tokenError"),
  wsStatus: document.getElementById("wsStatus"),
  matchLabel: document.getElementById("matchLabel"),
  tournamentLabel: document.getElementById("tournamentLabel"),
  updatedAt: document.getElementById("updatedAt"),
  scorePanel: document.getElementById("scorePanel"),
  timerPanel: document.getElementById("timerPanel"),
  scenePanel: document.getElementById("scenePanel"),
  statusPanel: document.getElementById("statusPanel"),
  bracketPanel: document.getElementById("bracketPanel"),
  sponsorsPanel: document.getElementById("sponsorsPanel"),
  teamAName: document.getElementById("teamAName"),
  teamBName: document.getElementById("teamBName"),
  scoreA: document.getElementById("scoreA"),
  scoreB: document.getElementById("scoreB"),
  roundNumber: document.getElementById("roundNumber"),
  seriesScoreA: document.getElementById("seriesScoreA"),
  seriesScoreB: document.getElementById("seriesScoreB"),
  seriesConfirm: document.getElementById("seriesConfirm"),
  seriesConfirmText: document.getElementById("seriesConfirmText"),
  confirmSeries: document.getElementById("confirmSeries"),
  cancelSeries: document.getElementById("cancelSeries"),
  timerDisplay: document.getElementById("timerDisplay"),
  timerState: document.getElementById("timerState"),
  timerInput: document.getElementById("timerInput"),
  timerSet: document.getElementById("timerSet"),
  timerStart: document.getElementById("timerStart"),
  timerPause: document.getElementById("timerPause"),
  timerReset: document.getElementById("timerReset"),
  activeScene: document.getElementById("activeScene"),
  activeCamera: document.getElementById("activeCamera"),
  sceneButtons: document.getElementById("sceneButtons"),
  cameraButtons: document.getElementById("cameraButtons"),
  statusButtons: document.getElementById("statusButtons"),
  statusConfirm: document.getElementById("statusConfirm"),
  confirmStatus: document.getElementById("confirmStatus"),
  cancelStatus: document.getElementById("cancelStatus"),
  bracketJson: document.getElementById("bracketJson"),
  validateBracket: document.getElementById("validateBracket"),
  submitBracket: document.getElementById("submitBracket"),
  clearBracket: document.getElementById("clearBracket"),
  bracketConfirm: document.getElementById("bracketConfirm"),
  confirmBracketClear: document.getElementById("confirmBracketClear"),
  cancelBracketClear: document.getElementById("cancelBracketClear"),
  sponsorAdd: document.getElementById("sponsorAdd"),
  addSponsor: document.getElementById("addSponsor"),
  sponsorList: document.getElementById("sponsorList"),
  submitSponsors: document.getElementById("submitSponsors"),
  scorePending: document.getElementById("scorePending"),
  timerPending: document.getElementById("timerPending"),
  scenePending: document.getElementById("scenePending"),
  statusPending: document.getElementById("statusPending"),
  bracketPending: document.getElementById("bracketPending"),
  sponsorsPending: document.getElementById("sponsorsPending"),
  scoreError: document.getElementById("scoreError"),
  timerError: document.getElementById("timerError"),
  sceneError: document.getElementById("sceneError"),
  statusError: document.getElementById("statusError"),
  bracketError: document.getElementById("bracketError"),
  sponsorsError: document.getElementById("sponsorsError"),
};

const state = {
  token: sessionStorage.getItem(tokenStorageKey) || "",
  ws: null,
  wsConnected: false,
  tokenValid: false,
  tokenChecked: false,
  pending: {
    score: false,
    round: false,
    series: false,
    timer: false,
    scene: false,
    camera: false,
    status: false,
    bracket: false,
    sponsors: false,
  },
  timeoutIds: {},
  current: {
    teamAName: "Team A",
    teamBName: "Team B",
    teamAScore: 0,
    teamBScore: 0,
    roundNumber: 0,
    seriesScoreA: 0,
    seriesScoreB: 0,
    timerSeconds: 0,
    timerAction: "pause",
    activeScene: "",
    activeCamera: "",
    status: "upcoming",
    sponsors: [],
    bracket: null,
  },
  seriesConfirmation: null,
  statusConfirmation: false,
  bracketConfirmClear: false,
  bracketDirty: false,
  sponsorDirty: false,
  reconnectTimer: null,
};

const pendingTimeoutMs = 1500;

function formatTime(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) {
    return "00:00";
  }
  const mins = String(Math.floor(value / 60)).padStart(2, "0");
  const secs = String(value % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function setTokenStatus(status, message) {
  elements.tokenStatus.textContent = status;
  elements.tokenStatus.className = `status-pill ${status.toLowerCase().replace(/\s+/g, "-")}`;
  elements.tokenError.textContent = message || "";
}

function setWsStatus(connected) {
  elements.wsStatus.textContent = connected
    ? "WS: connected"
    : "WS: disconnected";
  elements.wsStatus.className = `status-pill ${connected ? "connected" : "disconnected"}`;
}

function updatePanelPending(panel, isPending) {
  state.pending[panel] = isPending;
  const panelEl = document.getElementById(`${panel}Panel`);
  if (panelEl) {
    panelEl.classList.toggle("pending", isPending);
  }
  const label = elements[`${panel}Pending`];
  if (label) {
    label.textContent = isPending
      ? "Waiting for live confirmation"
      : "Live state synced";
  }
}

function showError(field, message) {
  const el = elements[`${field}Error`];
  if (el) {
    el.textContent = message;
  }
}

function clearError(field) {
  const el = elements[`${field}Error`];
  if (el) {
    el.textContent = "";
  }
}

function updateStateDisplay() {
  elements.matchLabel.textContent = matchId;
  elements.tournamentLabel.textContent = tournamentId || "none";
  elements.teamAName.textContent = state.current.teamAName || "Team A";
  elements.teamBName.textContent = state.current.teamBName || "Team B";
  elements.scoreA.textContent = String(state.current.teamAScore ?? 0);
  elements.scoreB.textContent = String(state.current.teamBScore ?? 0);
  elements.roundNumber.textContent = String(state.current.roundNumber ?? 0);
  elements.seriesScoreA.textContent = String(state.current.seriesScoreA ?? 0);
  elements.seriesScoreB.textContent = String(state.current.seriesScoreB ?? 0);
  elements.timerDisplay.textContent = formatTime(state.current.timerSeconds);
  elements.timerState.textContent =
    state.current.timerAction === "start" ? "Live" : "Paused";
  elements.activeScene.textContent = state.current.activeScene || "—";
  elements.activeCamera.textContent = state.current.activeCamera || "—";
  elements.updatedAt.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  document.querySelectorAll("button[data-status]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.status === state.current.status,
    );
  });

  document.querySelectorAll("button[data-scene]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.scene === state.current.activeScene,
    );
  });

  document.querySelectorAll("button[data-camera]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.camera === state.current.activeCamera,
    );
  });
}

function setBracketText(value) {
  if (!state.bracketDirty) {
    elements.bracketJson.value = value;
  }
}

function renderSponsorList(list) {
  const sponsors = Array.isArray(list) ? list : state.current.sponsors;
  elements.sponsorList.innerHTML = "";
  sponsors.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "sponsor-item";

    const title = document.createElement("div");
    title.className = "sponsor-title";
    title.textContent = item || `Sponsor ${index + 1}`;

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "sponsor-buttons";

    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "↑";
    up.addEventListener("click", () => moveSponsor(index, -1));

    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "↓";
    down.addEventListener("click", () => moveSponsor(index, 1));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => removeSponsor(index));

    buttonGroup.append(up, down, remove);
    li.append(title, buttonGroup);
    elements.sponsorList.append(li);
  });
}

function moveSponsor(index, direction) {
  const sponsors = [...state.current.sponsors];
  const target = index + direction;
  if (target < 0 || target >= sponsors.length) return;
  [sponsors[index], sponsors[target]] = [sponsors[target], sponsors[index]];
  state.current.sponsors = sponsors;
  state.sponsorDirty = true;
  renderSponsorList(sponsors);
}

function removeSponsor(index) {
  const sponsors = state.current.sponsors.filter((_, idx) => idx !== index);
  state.current.sponsors = sponsors;
  state.sponsorDirty = true;
  renderSponsorList(sponsors);
}

function writeSponsorsFromInput() {
  const raw = elements.sponsorAdd.value.trim();
  if (!raw) return;
  state.current.sponsors = [...state.current.sponsors, raw];
  state.sponsorDirty = true;
  elements.sponsorAdd.value = "";
  renderSponsorList(state.current.sponsors);
}

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  return headers;
}

function tokenAvailable() {
  if (!state.token) {
    setTokenStatus(
      "Token: unset",
      "Enter a bearer token before sending API requests.",
    );
    return false;
  }
  return true;
}

function setControlPending(control, active) {
  updatePanelPending(control, active);
  if (active) {
    clearError(control);
  }
}

function clearPending(control) {
  updatePanelPending(control, false);
}

function confirmRequest(control) {
  setControlPending(control, true);
  if (state.timeoutIds[control]) {
    clearTimeout(state.timeoutIds[control]);
  }
  state.timeoutIds[control] = window.setTimeout(() => {
    const label = elements[`${control}Pending`];
    if (label) {
      label.textContent = "Pending confirmation from live state";
    }
  }, pendingTimeoutMs);
}

async function sendApi(path, payload, control) {
  if (!tokenAvailable()) {
    showError(control, "No token available.");
    return null;
  }

  setControlPending(control, true);
  confirmRequest(control);

  try {
    const response = await fetch(`${API_BASE}/${path}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (response.status === 401) {
      state.tokenValid = false;
      state.tokenChecked = true;
      setTokenStatus("Token: invalid", "Bearer token rejected by the server.");
      showError(control, "Authorization failed.");
      clearPending(control);
      return null;
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error || response.statusText || "Request failed.";
      showError(control, `API error: ${message}`);
      clearPending(control);
      return null;
    }

    state.tokenValid = true;
    state.tokenChecked = true;
    setTokenStatus("Token: valid");
    return await response.json();
  } catch (error) {
    showError(control, "Network error. Check server connectivity.");
    clearPending(control);
    return null;
  }
}

function applyMatchSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;

  const matchState = snapshot.state || {};
  const scoreState = snapshot.score || {};

  state.current.teamAName =
    matchState.teamA || matchState.teamAName || state.current.teamAName;
  state.current.teamBName =
    matchState.teamB || matchState.teamBName || state.current.teamBName;
  state.current.teamAScore = Number.isFinite(Number(scoreState.teamAScore))
    ? Number(scoreState.teamAScore)
    : safeNumber(scoreState.teamAScore, state.current.teamAScore);
  state.current.teamBScore = Number.isFinite(Number(scoreState.teamBScore))
    ? Number(scoreState.teamBScore)
    : safeNumber(scoreState.teamBScore, state.current.teamBScore);
  state.current.roundNumber = Number.isFinite(Number(scoreState.roundNumber))
    ? Number(scoreState.roundNumber)
    : safeNumber(scoreState.roundNumber, state.current.roundNumber);
  state.current.seriesScoreA = Number.isFinite(Number(matchState.seriesScoreA))
    ? Number(matchState.seriesScoreA)
    : safeNumber(matchState.seriesScoreA, state.current.seriesScoreA);
  state.current.seriesScoreB = Number.isFinite(Number(matchState.seriesScoreB))
    ? Number(matchState.seriesScoreB)
    : safeNumber(matchState.seriesScoreB, state.current.seriesScoreB);
  state.current.timerSeconds = Number.isFinite(Number(snapshot.timer))
    ? Number(snapshot.timer)
    : state.current.timerSeconds;
  state.current.timerAction = snapshot.timer > 0 ? "start" : "pause";
  state.current.activeScene =
    matchState.activeScene || state.current.activeScene;
  state.current.activeCamera =
    matchState.activeCamera || state.current.activeCamera;
  state.current.status = matchState.status || state.current.status;
  state.current.sponsors = Array.isArray(snapshot.sponsors)
    ? snapshot.sponsors
    : state.current.sponsors;

  if (!state.bracketDirty && snapshot.bracket) {
    state.current.bracket = snapshot.bracket;
    setBracketText(JSON.stringify(snapshot.bracket, null, 2));
  }

  updateStateDisplay();
  Object.keys(state.pending).forEach((control) => {
    if (state.pending[control]) {
      clearPending(control);
    }
  });
}

function applyBracketSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;
  const bracket = snapshot.bracket || snapshot;
  state.current.bracket = bracket;
  if (!state.bracketDirty) {
    setBracketText(JSON.stringify(bracket, null, 2));
  }
  clearPending("bracket");
}

function handleWsMessage(payload) {
  if (!payload || typeof payload !== "object") return;
  if (payload.type === "snapshot") {
    if (payload.channel === "match:snapshot") {
      applyMatchSnapshot(payload.data || {});
      return;
    }
    if (payload.channel === "bracket:snapshot") {
      applyBracketSnapshot(payload.data || {});
      return;
    }
  }

  switch (payload.channel) {
    case "score:update":
      if (payload.data?.score) {
        state.current.teamAScore = safeNumber(
          payload.data.score.teamAScore,
          state.current.teamAScore,
        );
        state.current.teamBScore = safeNumber(
          payload.data.score.teamBScore,
          state.current.teamBScore,
        );
        state.current.roundNumber = safeNumber(
          payload.data.score.roundNumber,
          state.current.roundNumber,
        );
      }
      clearPending("score");
      updateStateDisplay();
      break;
    case "match:status":
      if (payload.data?.state) {
        const matchState = payload.data.state;
        state.current.teamAName = matchState.teamA || state.current.teamAName;
        state.current.teamBName = matchState.teamB || state.current.teamBName;
        state.current.seriesScoreA = safeNumber(
          matchState.seriesScoreA,
          state.current.seriesScoreA,
        );
        state.current.seriesScoreB = safeNumber(
          matchState.seriesScoreB,
          state.current.seriesScoreB,
        );
        state.current.status = matchState.status || state.current.status;
        state.current.activeScene =
          matchState.activeScene || state.current.activeScene;
        state.current.activeCamera =
          matchState.activeCamera || state.current.activeCamera;
      }
      clearPending("status");
      clearPending("series");
      updateStateDisplay();
      break;
    case "timer:tick":
      state.current.timerSeconds = Number.isFinite(
        Number(payload.data?.seconds),
      )
        ? Number(payload.data.seconds)
        : state.current.timerSeconds;
      state.current.timerAction =
        String(payload.data?.action || "pause").toLowerCase() === "start"
          ? "start"
          : "pause";
      clearPending("timer");
      updateStateDisplay();
      break;
    case "scene:change":
      state.current.activeScene =
        payload.data?.activeScene || state.current.activeScene;
      if (payload.data?.activeCamera !== undefined) {
        state.current.activeCamera =
          payload.data.activeCamera || state.current.activeCamera;
      }
      clearPending("scene");
      clearPending("camera");
      updateStateDisplay();
      break;
    case "sponsor:rotate":
      if (Array.isArray(payload.data?.sponsors)) {
        state.current.sponsors = payload.data.sponsors;
        if (!state.sponsorDirty) {
          renderSponsorList(state.current.sponsors);
        }
      }
      clearPending("sponsors");
      break;
    case "bracket:update":
      if (payload.data?.bracket) {
        state.current.bracket = payload.data.bracket;
        if (!state.bracketDirty) {
          setBracketText(JSON.stringify(payload.data.bracket, null, 2));
        }
      }
      clearPending("bracket");
      break;
    default:
      break;
  }
}

function connectWebSocket() {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  const url = new URL(`${scheme}://${window.location.host}/ws`);
  url.searchParams.set("matchId", matchId);
  if (tournamentId) {
    url.searchParams.set("tournamentId", tournamentId);
  }

  state.ws = new WebSocket(url.toString());

  state.ws.addEventListener("open", () => {
    state.wsConnected = true;
    setWsStatus(true);
    const channels = [
      "score:update",
      "timer:tick",
      "scene:change",
      "match:status",
      "sponsor:rotate",
    ];
    if (tournamentId) {
      channels.push("bracket:update");
    }
    state.ws.send(JSON.stringify({ type: "subscribe", channels }));
    state.ws.send(JSON.stringify({ type: "snapshot", matchId }));
  });

  state.ws.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleWsMessage(payload);
    } catch (error) {
      // ignore malformed websocket payloads
    }
  });

  state.ws.addEventListener("close", () => {
    state.wsConnected = false;
    setWsStatus(false);
    scheduleReconnect();
  });

  state.ws.addEventListener("error", () => {
    state.wsConnected = false;
    setWsStatus(false);
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (state.reconnectTimer) return;
  state.reconnectTimer = window.setTimeout(() => {
    state.reconnectTimer = null;
    connectWebSocket();
  }, 1800);
}

async function fetchMatchSnapshot() {
  try {
    const response = await fetch(`${API_BASE}/match/${matchId}/snapshot`);
    if (!response.ok) return;
    const payload = await response.json();
    applyMatchSnapshot(payload);
  } catch (error) {
    // ignore fallback failures
  }
}

async function fetchSponsorsSnapshot() {
  try {
    const response = await fetch(`${API_BASE}/sponsors/rotation`);
    if (!response.ok) return;
    const payload = await response.json();
    if (Array.isArray(payload.sponsors)) {
      state.current.sponsors = payload.sponsors;
      if (!state.sponsorDirty) {
        renderSponsorList(payload.sponsors);
      }
    }
  } catch (error) {
    // ignore fallback failures
  }
}

async function fetchBracketSnapshot() {
  if (!tournamentId) return;
  try {
    const response = await fetch(
      `${API_BASE}/bracket/${encodeURIComponent(tournamentId)}`,
    );
    if (!response.ok) return;
    const payload = await response.json();
    const bracket = payload.bracket || payload;
    state.current.bracket = bracket;
    if (!state.bracketDirty) {
      setBracketText(JSON.stringify(bracket, null, 2));
    }
  } catch (error) {
    // ignore fallback failures
  }
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function stageSeriesUpdate(field, delta) {
  const currentValue = state.current[field] ?? 0;
  const newValue = Math.max(0, currentValue + delta);
  state.seriesConfirmation = { field, target: newValue };
  elements.seriesConfirmText.textContent = `Set ${field === "seriesScoreA" ? "Series A" : "Series B"} to ${newValue}?`;
  elements.seriesConfirm.classList.remove("hidden");
}

function cancelSeriesUpdate() {
  state.seriesConfirmation = null;
  elements.seriesConfirm.classList.add("hidden");
}

async function submitSeriesUpdate() {
  if (!state.seriesConfirmation) return;
  const field = state.seriesConfirmation.field;
  const payload = {
    seriesScoreA: String(
      field === "seriesScoreA"
        ? state.seriesConfirmation.target
        : state.current.seriesScoreA,
    ),
    seriesScoreB: String(
      field === "seriesScoreB"
        ? state.seriesConfirmation.target
        : state.current.seriesScoreB,
    ),
  };
  elements.seriesConfirm.classList.add("hidden");
  state.seriesConfirmation = null;
  await sendApi(`match/${matchId}/state`, payload, "series");
}

function askStatusConfirmation(status) {
  if (status === "completed") {
    state.statusConfirmation = true;
    elements.statusConfirm.classList.remove("hidden");
    return;
  }
  sendApi(`match/${matchId}/status`, { status }, "status");
}

function cancelStatusConfirmation() {
  state.statusConfirmation = false;
  elements.statusConfirm.classList.add("hidden");
}

async function confirmStatusUpdate() {
  state.statusConfirmation = false;
  elements.statusConfirm.classList.add("hidden");
  await sendApi(`match/${matchId}/status`, { status: "completed" }, "status");
}

function validateBracketText() {
  const value = elements.bracketJson.value.trim();
  if (!value) {
    showError("bracket", "Bracket JSON cannot be empty.");
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    clearError("bracket");
    return parsed;
  } catch (error) {
    showError("bracket", "Invalid JSON format.");
    return null;
  }
}

async function submitBracketUpdate() {
  const bracket = validateBracketText();
  if (bracket === null) return;
  if (!tournamentId) {
    showError("bracket", "Missing tournamentId in URL.");
    return;
  }
  state.bracketDirty = false;
  await sendApi(
    `bracket/${encodeURIComponent(tournamentId)}`,
    { bracket },
    "bracket",
  );
}

function askBracketClear() {
  if (!tournamentId) {
    showError("bracket", "Missing tournamentId in URL.");
    return;
  }
  elements.bracketConfirm.classList.remove("hidden");
}

function cancelBracketClear() {
  elements.bracketConfirm.classList.add("hidden");
}

async function confirmBracketClear() {
  elements.bracketConfirm.classList.add("hidden");
  await sendApi(
    `bracket/${encodeURIComponent(tournamentId)}`,
    { bracket: [] },
    "bracket",
  );
}

async function submitSponsorsUpdate() {
  if (!state.current.sponsors.length) {
    showError("sponsors", "Sponsor rotation must include at least one entry.");
    return;
  }
  state.sponsorDirty = false;
  await sendApi(
    "sponsors/rotation",
    { sponsors: state.current.sponsors },
    "sponsors",
  );
}

function clearBracketPanel() {
  elements.bracketJson.value = "";
  state.bracketDirty = false;
}

function loadTokenFromStorage() {
  if (state.token) {
    setTokenStatus("Token: saved");
  } else {
    setTokenStatus("Token: unset");
  }
}

function saveToken() {
  const raw = elements.tokenInput.value.trim();
  if (!raw) {
    setTokenStatus("Token: unset", "Enter a valid bearer token.");
    return;
  }
  state.token = raw;
  sessionStorage.setItem(tokenStorageKey, raw);
  setTokenStatus("Token: saved");
  elements.tokenInput.value = "";
}

function clearToken() {
  state.token = "";
  state.tokenValid = false;
  state.tokenChecked = false;
  sessionStorage.removeItem(tokenStorageKey);
  setTokenStatus("Token: unset", "Bearer token cleared.");
}

function setupEventListeners() {
  elements.saveToken.addEventListener("click", saveToken);
  elements.clearToken.addEventListener("click", clearToken);
  elements.addSponsor.addEventListener("click", writeSponsorsFromInput);
  elements.sponsorAdd.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      writeSponsorsFromInput();
    }
  });

  document.querySelectorAll("button[data-field]").forEach((button) => {
    button.addEventListener("click", async () => {
      const field = button.dataset.field;
      const delta = button.dataset.action === "increment" ? 1 : -1;
      if (field === "seriesScoreA" || field === "seriesScoreB") {
        stageSeriesUpdate(field, delta);
        return;
      }

      const currentValue = state.current[field] ?? 0;
      const nextValue = Math.max(0, currentValue + delta);
      const payload = {
        teamAScore: String(
          field === "teamAScore" ? nextValue : state.current.teamAScore,
        ),
        teamBScore: String(
          field === "teamBScore" ? nextValue : state.current.teamBScore,
        ),
        roundNumber: String(
          field === "roundNumber" ? nextValue : state.current.roundNumber,
        ),
      };
      await sendApi(`match/${matchId}/score`, payload, "score");
    });
  });

  elements.confirmSeries.addEventListener("click", submitSeriesUpdate);
  elements.cancelSeries.addEventListener("click", cancelSeriesUpdate);

  elements.timerSet.addEventListener("click", async () => {
    const seconds = safeNumber(
      elements.timerInput.value,
      state.current.timerSeconds,
    );
    await sendApi(
      `match/${matchId}/timer`,
      { action: "pause", seconds },
      "timer",
    );
  });

  elements.timerStart.addEventListener("click", async () => {
    await sendApi(
      `match/${matchId}/timer`,
      { action: "start", seconds: state.current.timerSeconds },
      "timer",
    );
  });

  elements.timerPause.addEventListener("click", async () => {
    await sendApi(
      `match/${matchId}/timer`,
      { action: "pause", seconds: state.current.timerSeconds },
      "timer",
    );
  });

  elements.timerReset.addEventListener("click", async () => {
    await sendApi(`match/${matchId}/timer`, { action: "reset" }, "timer");
  });

  document.querySelectorAll("button[data-scene]").forEach((button) => {
    button.addEventListener("click", async () => {
      const scene = button.dataset.scene;
      await sendApi(`match/${matchId}/scene`, { activeScene: scene }, "scene");
    });
  });

  document.querySelectorAll("button[data-camera]").forEach((button) => {
    button.addEventListener("click", async () => {
      const camera = button.dataset.camera;
      await sendApi(
        `match/${matchId}/camera`,
        { activeCamera: camera },
        "camera",
      );
    });
  });

  document.querySelectorAll("button[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      askStatusConfirmation(button.dataset.status);
    });
  });

  elements.confirmStatus.addEventListener("click", confirmStatusUpdate);
  elements.cancelStatus.addEventListener("click", cancelStatusConfirmation);

  elements.validateBracket.addEventListener("click", () => {
    if (validateBracketText() !== null) {
      showError("bracket", "Bracket JSON is valid.");
    }
  });

  elements.submitBracket.addEventListener("click", submitBracketUpdate);
  elements.clearBracket.addEventListener("click", askBracketClear);
  elements.confirmBracketClear.addEventListener("click", confirmBracketClear);
  elements.cancelBracketClear.addEventListener("click", cancelBracketClear);
  elements.submitSponsors.addEventListener("click", submitSponsorsUpdate);

  elements.bracketJson.addEventListener("input", () => {
    state.bracketDirty = true;
  });
}

function initialize() {
  loadTokenFromStorage();
  elements.matchLabel.textContent = matchId;
  elements.tournamentLabel.textContent = tournamentId || "none";
  renderSponsorList(state.current.sponsors);
  updateStateDisplay();
  setupEventListeners();
  connectWebSocket();
  window.setTimeout(fetchMatchSnapshot, 1200);
  window.setTimeout(fetchSponsorsSnapshot, 1200);
  if (tournamentId) {
    window.setTimeout(fetchBracketSnapshot, 1200);
  }
}

initialize();
