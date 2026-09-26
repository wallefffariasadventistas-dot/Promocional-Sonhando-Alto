const bcrypt = require("bcryptjs");
const { signAdminToken, setAdminCookie } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  if (!process.env.SESSION_SECRET) {
    return res.status(500).json({
      error: "SESSION_SECRET não configurado no ambiente. Defina essa variável no Vercel e faça um redeploy.",
    });
  }

  try {
    const { username, password } = req.body || {};
    const expectedUser = process.env.ADMIN_USERNAME || "admin";
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;

    if (typeof username !== "string" || username.trim().length === 0) {
      return res.status(400).json({ error: "Informe o usuário." });
    }

    // TEMPORÁRIO: enquanto ADMIN_PASSWORD_HASH não for configurado, libera o
    // acesso sem checar senha. Assim que a variável for definida no ambiente,
    // a checagem de senha abaixo volta a valer automaticamente.
    if (!expectedHash) {
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
