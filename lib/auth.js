const jwt = require("jsonwebtoken");

const COOKIE_NAME = "sonhandoalto_admin";
const MAX_AGE_SECONDS = 60 * 60 * 4; // 4 horas

// TEMPORÁRIO: usado só enquanto SESSION_SECRET não é configurado no ambiente
// (ex: Vercel → Settings → Environment Variables). Qualquer pessoa que veja
// o código-fonte consegue forjar um cookie de admin com este valor, então
// assim que possível defina SESSION_SECRET de verdade — a troca é automática,
// sem precisar mexer em mais nada.
const INSECURE_DEFAULT_SECRET = "sonhando-alto-temp-secret-troque-depois-9f3a7c1e";

function getSecret() {
  return process.env.SESSION_SECRET || INSECURE_DEFAULT_SECRET;
}

function signAdminToken(email) {
  return jwt.sign({ isAdmin: true, email }, getSecret(), {
    expiresIn: MAX_AGE_SECONDS,
  });
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function getAdminSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret());
    return payload && payload.isAdmin ? payload : null;
  } catch {
    return null;
  }
}

function setAdminCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearAdminCookie(res) {
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "Max-Age=0", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

/** Escreve 401 na resposta e retorna null quando não autenticado. */
function requireAdmin(req, res) {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Não autenticado." });
    return null;
  }
  return session;
}

module.exports = {
  signAdminToken,
  getAdminSession,
  setAdminCookie,
  clearAdminCookie,
  requireAdmin,
};
