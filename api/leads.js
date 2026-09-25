const { insertLead } = require("../lib/db");
const { validateLead, isBlank } = require("../lib/validate-lead");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const body = req.body || {};

  // Honeypot: usuários reais nunca preenchem este campo oculto.
  if (!isBlank(body.website)) {
    return res.status(200).json({ ok: true });
  }

  const { errors, data } = validateLead(body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  try {
    await insertLead(data);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Erro ao salvar lead:", err);
    return res.status(500).json({ error: "Não foi possível salvar seus dados. Tente novamente." });
  }
};
