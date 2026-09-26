const { verifyIdToken } = require("../../lib/firebase-auth");
const { signAdminToken, setAdminCookie } = require("../../lib/auth");

function isAllowedEmail(email) {
  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Sem lista configurada: qualquer e-mail cadastrado no Firebase
  // Authentication do projeto pode entrar (o acesso já é controlado por lá).
  if (allowlist.length === 0) return true;

  return allowlist.includes(email.toLowerCase());
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { idToken } = req.body || {};
    if (typeof idToken !== "string" || idToken.length === 0) {
      return res.status(400).json({ error: "Token de login ausente." });
    }

    const decoded = await verifyIdToken(idToken);

    if (!decoded.email) {
      return res.status(401).json({ error: "Esta conta não tem um e-mail associado." });
    }

    if (!isAllowedEmail(decoded.email)) {
      return res.status(403).json({ error: "Este e-mail não tem acesso ao painel administrativo." });
    }

    const token = signAdminToken(decoded.email);
    setAdminCookie(res, token);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro no login do admin:", err);
    return res.status(401).json({ error: "Não foi possível validar o login. Tente novamente." });
  }
};
