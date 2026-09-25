const ExcelJS = require("exceljs");
const { requireAdmin } = require("../../lib/auth");
const { listLeads } = require("../../lib/db");

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const leads = await listLeads();

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
      { header: "Data de Cadastro", key: "created_at", width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };
    leads.forEach((lead) => sheet.addRow(lead));

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="leads-sonhando-alto.xlsx"');
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error("Erro ao gerar Excel:", err);
    return res.status(500).json({ error: "Não foi possível gerar o Excel." });
  }
};
