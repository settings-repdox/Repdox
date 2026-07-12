const OBSWebSocket = require("obs-websocket-js").default;
const Redis = require("ioredis");

const OBS_URL = process.env.OBS_WEBSOCKET_URL || "ws://localhost:4455";
const OBS_PASSWORD = process.env.OBS_WEBSOCKET_PASSWORD || "";
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

class ObsClient {
  constructor() {
    this.obs = new OBSWebSocket();
    this.sub = new Redis(REDIS_URL, redisOptions);
    this.connected = false;
    this.connecting = false;
    this.pendingTargetScene = null;
    this.init();
    this.initSubscriber();
  }

  initSubscriber() {
    this.sub.on("connect", () => {
      console.log("OBS Redis subscriber connecting");
    });
    this.sub.on("ready", () => {
      console.log("OBS Redis subscriber ready");
    });
    this.sub.on("error", (error) => {
      console.error("OBS Redis subscriber error:", error.message || error);
    });
    this.sub.on("close", () => {
      console.warn("OBS Redis subscriber closed");
    });

    this.sub.subscribe("scene:change").catch((error) => {
      console.error("OBS Redis subscribe failed:", error.message);
    });

    this.sub.on("message", (channel, rawPayload) => {
      if (channel !== "scene:change") {
        return;
      }
      try {
        const payload = JSON.parse(rawPayload);
        const scene = payload.activeScene || payload.scene || "";
        if (scene) {
          this.setScene(scene);
        }
      } catch (error) {
        console.error("OBS scene payload parse failed:", error.message);
      }
    });
  }

  async init() {
    if (this.connecting || this.connected) {
      return;
    }
    this.connecting = true;

    try {
      await this.obs.connect(OBS_URL, OBS_PASSWORD);
      this.connected = true;
      this.connecting = false;
      this.installListeners();
      console.log("OBS WebSocket connected");
      if (this.pendingTargetScene) {
        await this.setScene(this.pendingTargetScene);
        this.pendingTargetScene = null;
      }
    } catch (error) {
      this.connecting = false;
      console.error("OBS connect failed:", error.message);
      setTimeout(() => this.init(), 3000);
    }
  }

  installListeners() {
    this.obs.on("ConnectionClosed", () => {
      this.connected = false;
      console.warn("OBS WebSocket connection closed");
      this.init();
    });
    this.obs.on("AuthenticationSuccess", () => {
      console.log("OBS WebSocket authenticated");
    });
    this.obs.on("error", (error) => {
      console.error("OBS WebSocket error", error.message);
    });
  }

  async setScene(sceneName) {
    if (!sceneName) {
      return;
    }
    if (!this.connected) {
      this.pendingTargetScene = sceneName;
      if (!this.connecting) {
        this.init();
      }
      return;
    }

    try {
      await this.obs.call("SetCurrentProgramScene", { sceneName });
      console.log("OBS scene changed to", sceneName);
    } catch (error) {
      console.error("OBS setScene failed:", error.message);
      this.connected = false;
      this.init();
    }
  }
}

const obsClient = new ObsClient();

module.exports = obsClient;
