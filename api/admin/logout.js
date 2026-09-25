const { clearAdminCookie } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }
  clearAdminCookie(res);
  return res.json({ ok: true });
};
