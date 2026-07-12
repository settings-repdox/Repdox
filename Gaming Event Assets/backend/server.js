require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const bodyParser = require("body-parser");
const routes = require("./routes");
const { createWebSocketServer } = require("./ws/broadcaster");
const obsClient = require("./obs/obsClient");
const { client } = require("./redis");

const PORT = process.env.PORT || 4000;

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use("/api", routes);
app.use("/overlays", express.static(path.join(__dirname, "../overlays")));
app.use("/admin", express.static(path.join(__dirname, "../admin")));

app.get("/health", async (req, res) => {
  try {
    await client.ping();
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Redis unreachable" });
  }
});

const server = http.createServer(app);
createWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Repdox backend listening on http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  console.log("Shutting down Repdox backend");
  client.quit();
  process.exit(0);
});
