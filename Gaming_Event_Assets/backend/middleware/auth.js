const ADMIN_TOKEN = process.env.ADMIN_BEARER_TOKEN;

if (!ADMIN_TOKEN) {
  console.error(
    "[Auth] ADMIN_BEARER_TOKEN environment variable is required. Set ADMIN_BEARER_TOKEN and restart the server.",
  );
  // Fail fast — do not run the server without a secure token configured.
  process.exit(1);
}

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  if (
    !authorization.startsWith("Bearer ") ||
    authorization.slice(7) !== ADMIN_TOKEN
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

module.exports = requireAuth;
