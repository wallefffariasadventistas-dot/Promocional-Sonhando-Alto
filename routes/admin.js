const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const db = require("../lib/db");
const { requireAdmin } = require("../lib/auth");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
});

const listLeads = db.prepare("SELECT * FROM leads ORDER BY created_at DESC");

router.post("/login", loginLimiter, async (req, res) => {
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

  req.session.isAdmin = true;
  req.session.username = username;
  return res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/session", (req, res) => {
  res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) });
});

router.get("/leads", requireAdmin, (req, res) => {
  const leads = listLeads.all();
  res.json({ leads });
});

router.get("/leads/export.xlsx", requireAdmin, async (req, res) => {
  const leads = listLeads.all();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");
  sheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Nome", key: "nome", width: 30 },
    { header: "Telefone", key: "telefone", width: 18 },
    { header: "Idade", key: "idade", width: 8 },
    { header: "Curso de Interesse", key: "curso", width: 25 },
    { header: "Cidade", key: "cidade", width: 20 },
    { header: "Distrito", key: "distrito", width: 20 },
    { header: "Data de Cadastro", key: "created_at", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  leads.forEach((lead) => sheet.addRow(lead));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", 'attachment; filename="leads-sonhando-alto.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
});

router.get("/leads/export.pdf", requireAdmin, (req, res) => {
  const leads = listLeads.all();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="leads-sonhando-alto.pdf"');

  const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
  doc.pipe(res);

  doc.fontSize(16).text("Leads - Sonhando Alto", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#555").text(`Gerado em ${new Date().toLocaleString("pt-BR")} — total: ${leads.length}`, {
    align: "center",
  });
  doc.moveDown(1);

  const columns = [
    { key: "id", label: "ID", width: 30 },
    { key: "nome", label: "Nome", width: 130 },
    { key: "telefone", label: "Telefone", width: 90 },
    { key: "idade", label: "Idade", width: 40 },
    { key: "curso", label: "Curso de Interesse", width: 140 },
    { key: "cidade", label: "Cidade", width: 100 },
    { key: "distrito", label: "Distrito", width: 100 },
    { key: "created_at", label: "Cadastro", width: 110 },
  ];

  const startX = doc.page.margins.left;
  let y = doc.y;
  const rowHeight = 20;

  function drawRow(values, y, isHeader) {
    let x = startX;
    doc.fontSize(8).fillColor(isHeader ? "#ffffff" : "#111111");
    if (isHeader) {
      doc.rect(startX, y, columns.reduce((s, c) => s + c.width, 0), rowHeight).fill("#12294d");
      doc.fillColor("#ffffff");
    }
    columns.forEach((col, i) => {
      doc.text(String(values[i] ?? ""), x + 4, y + 6, { width: col.width - 8, ellipsis: true });
      x += col.width;
    });
  }

  drawRow(columns.map((c) => c.label), y, true);
  y += rowHeight;
  doc.fillColor("#111111");

  leads.forEach((lead, idx) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawRow(columns.map((c) => c.label), y, true);
      y += rowHeight;
    }
    if (idx % 2 === 0) {
      doc.rect(startX, y, columns.reduce((s, c) => s + c.width, 0), rowHeight).fill("#f2f2f2");
      doc.fillColor("#111111");
    }
    drawRow(
      columns.map((c) => lead[c.key]),
      y,
      false
    );
    y += rowHeight;
  });

  doc.end();
});

module.exports = router;
