const { requireAdmin } = require("../../lib/auth");
const { listLeads } = require("../../lib/db");

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const leads = await listLeads();
    return res.json({ leads });
  } catch (err) {
    console.error("Erro ao listar leads:", err);
    return res.status(500).json({ error: "Não foi possível carregar os leads." });
  }
};
