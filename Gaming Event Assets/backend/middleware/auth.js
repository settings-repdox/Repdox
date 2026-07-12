const ADMIN_TOKEN = process.env.ADMIN_BEARER_TOKEN || "repdox-admin-token";

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
