import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// Global error handler for development/debugging
window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error);
  console.error("Error message:", event.message);
  console.error("Stack:", event.error?.stack);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
});

console.log("App initializing...");

try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found - check index.html");
  }

  console.log("Root element found, creating React app...");
  
  createRoot(root).render(
    <StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </StrictMode>,
  );
  
  console.log("React app rendered successfully");
} catch (err) {
  console.error("Fatal error during app initialization:", err);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace; background: #f0f0f0; color: red;">
      <h1>Error Loading App</h1>
      <pre>${err instanceof Error ? err.stack : String(err)}</pre>
    </div>
  `;
}
