const express = require("express");
const rateLimit = require("express-rate-limit");
const db = require("../lib/db");
const COURSES = require("../lib/courses");

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
});

const insertLead = db.prepare(`
  INSERT INTO leads (nome, telefone, idade, curso, cidade, distrito)
  VALUES (@nome, @telefone, @idade, @curso, @cidade, @distrito)
`);

function isBlank(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

router.post("/", submitLimiter, (req, res) => {
  const body = req.body || {};

  // Honeypot: real users never fill this hidden field.
  if (!isBlank(body.website)) {
    return res.status(200).json({ ok: true });
  }

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const telefone = typeof body.telefone === "string" ? body.telefone.trim() : "";
  const curso = typeof body.curso === "string" ? body.curso.trim() : "";
  const cidade = typeof body.cidade === "string" ? body.cidade.trim() : "";
  const distrito = typeof body.distrito === "string" ? body.distrito.trim() : "";
  const idade = Number.parseInt(body.idade, 10);

  const errors = [];
  if (isBlank(nome) || nome.length > 150) errors.push("Nome inválido.");
  if (isBlank(telefone) || telefone.replace(/\D/g, "").length < 8 || telefone.length > 30) {
    errors.push("Telefone inválido.");
  }
  if (!Number.isInteger(idade) || idade < 10 || idade > 100) errors.push("Idade inválida.");
  if (isBlank(curso) || !COURSES.includes(curso)) errors.push("Curso de interesse inválido.");
  if (isBlank(cidade) || cidade.length > 100) errors.push("Cidade inválida.");
  if (isBlank(distrito) || distrito.length > 100) errors.push("Distrito inválido.");

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  insertLead.run({ nome, telefone, idade, curso, cidade, distrito });

  return res.status(201).json({ ok: true });
});

module.exports = router;
