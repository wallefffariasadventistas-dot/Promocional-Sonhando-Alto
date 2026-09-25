const COURSES = require("./courses");

function isBlank(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function validateLead(body) {
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

  return { errors, data: { nome, telefone, idade, curso, cidade, distrito } };
}

module.exports = { validateLead, isBlank };
