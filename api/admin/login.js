const bcrypt = require("bcryptjs");
const { signAdminToken, setAdminCookie } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedHash) {
    return res.status(500).json({ error: "ADMIN_PASSWORD_HASH não configurado no servidor." });
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
  }

  const userOk = username === expectedUser;
  const passOk = await bcrypt.compare(password, expectedHash);

  if (!userOk || !passOk) {
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }

  const token = signAdminToken(username);
  setAdminCookie(res, token);
  return res.json({ ok: true });
};
