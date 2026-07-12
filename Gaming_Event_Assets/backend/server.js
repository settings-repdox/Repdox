require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const routes = require("./routes");
const { createWebSocketServer } = require("./ws/broadcaster");
const obsClient = require("./obs/obsClient");
const { client } = require("./redis");

const PORT = process.env.PORT || 4000;

const app = express();
// Use Express's built-in JSON body parser instead of the body-parser package
app.use(express.json());
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

// Note: single authoritative health endpoint lives at /api/health

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
