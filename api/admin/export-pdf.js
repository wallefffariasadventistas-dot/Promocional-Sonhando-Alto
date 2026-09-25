const PDFDocument = require("pdfkit");
const { requireAdmin } = require("../../lib/auth");
const { listLeads } = require("../../lib/db");

const COLUMNS = [
  { key: "id", label: "ID", width: 30 },
  { key: "nome", label: "Nome", width: 130 },
  { key: "telefone", label: "Telefone", width: 90 },
  { key: "idade", label: "Idade", width: 40 },
  { key: "curso", label: "Curso de Interesse", width: 140 },
  { key: "cidade", label: "Cidade", width: 100 },
  { key: "distrito", label: "Distrito", width: 100 },
  { key: "created_at", label: "Cadastro", width: 110 },
];

function buildPdfBuffer(leads) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text("Leads - Sonhando Alto", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor("#555")
      .text(`Gerado em ${new Date().toLocaleString("pt-BR")} — total: ${leads.length}`, {
        align: "center",
      });
    doc.moveDown(1);

    const startX = doc.page.margins.left;
    const rowHeight = 20;
    const tableWidth = COLUMNS.reduce((sum, col) => sum + col.width, 0);
    let y = doc.y;

    function drawRow(lead, rowY, isHeader) {
      let x = startX;
      if (isHeader) {
        doc.rect(startX, rowY, tableWidth, rowHeight).fill("#12294d");
        doc.fillColor("#ffffff");
      }
      doc.fontSize(8);
      COLUMNS.forEach((col) => {
        const value = isHeader ? col.label : lead[col.key];
        doc.text(String(value ?? ""), x + 4, rowY + 6, { width: col.width - 8, ellipsis: true });
        x += col.width;
      });
    }

    drawRow(null, y, true);
    y += rowHeight;
    doc.fillColor("#111111");

    leads.forEach((lead, idx) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(null, y, true);
        y += rowHeight;
      }
      if (idx % 2 === 0) {
        doc.rect(startX, y, tableWidth, rowHeight).fill("#f2f2f2");
      }
      doc.fillColor("#111111");
      drawRow(lead, y, false);
      y += rowHeight;
    });

    doc.end();
  });
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const leads = await listLeads();
    const buffer = await buildPdfBuffer(leads);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="leads-sonhando-alto.pdf"');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    return res.status(500).json({ error: "Não foi possível gerar o PDF." });
  }
};
