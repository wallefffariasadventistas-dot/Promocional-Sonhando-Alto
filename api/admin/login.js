const { verifyIdToken } = require("../../lib/firebase-auth");
const { signAdminToken, setAdminCookie } = require("../../lib/auth");

function getAllowlist() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
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

    // Login é feito com Google — qualquer pessoa com conta Google consegue se
    // autenticar no Firebase. Por isso ADMIN_EMAILS é obrigatório: sem ele
    // configurado, ninguém entra (mais seguro do que liberar geral).
    const allowlist = getAllowlist();
    if (allowlist.length === 0) {
      return res.status(403).json({
        error:
          "Nenhum e-mail autorizado foi configurado no servidor. Defina ADMIN_EMAILS " +
          "com o(s) e-mail(s) que podem acessar o painel.",
      });
    }

    if (!allowlist.includes(decoded.email.toLowerCase())) {
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
