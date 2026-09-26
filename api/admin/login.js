const bcrypt = require("bcryptjs");
const { signAdminToken, setAdminCookie } = require("../../lib/auth");

// TEMPORÁRIO: credenciais fixas usadas só enquanto ADMIN_PASSWORD_HASH não é
// configurado no ambiente. Troque assim que possível gerando um hash de
// verdade (npm run hash-password) e definindo ADMIN_PASSWORD_HASH no Vercel —
// a checagem abaixo passa a exigi-lo automaticamente, sem mexer no código.
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "12345";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { username, password } = req.body || {};
    const expectedUser = process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;

    if (typeof username !== "string" || username.trim().length === 0) {
      return res.status(400).json({ error: "Informe o usuário." });
    }

    if (!expectedHash) {
      const userOk = username.trim() === expectedUser;
      const passOk = password === DEFAULT_PASSWORD;
      if (!userOk || !passOk) {
        return res.status(401).json({ error: "Usuário ou senha inválidos." });
      }
      const token = signAdminToken(username.trim());
      setAdminCookie(res, token);
      return res.json({ ok: true });
    }

    if (typeof password !== "string") {
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
  } catch (err) {
    console.error("Erro no login do admin:", err);
    return res.status(500).json({ error: "Erro interno ao tentar entrar. Tente novamente." });
  }
};
