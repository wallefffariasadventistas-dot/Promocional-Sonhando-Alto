(function () {
  const tbody = document.getElementById("leads-tbody");
  const searchInput = document.getElementById("search-input");
  const totalCount = document.getElementById("total-count");
  const logoutBtn = document.getElementById("logout-btn");
  const exportXlsxBtn = document.getElementById("export-xlsx-btn");
  const exportPdfBtn = document.getElementById("export-pdf-btn");

  const auth = firebase.auth();
  const db = firebase.firestore();

  let allLeads = [];

  function formatDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function render(leads) {
    if (leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="admin-table__empty">Nenhum lead encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = leads
      .map(
        (lead) => `
        <tr>
          <td>${escapeHtml(lead.nome)}</td>
          <td>${escapeHtml(lead.telefone)}</td>
          <td>${escapeHtml(lead.idade)}</td>
          <td>${escapeHtml(lead.curso)}</td>
          <td>${escapeHtml(lead.cidade)}</td>
          <td>${escapeHtml(lead.distrito)}</td>
          <td>${escapeHtml(formatDate(lead.created_at))}</td>
        </tr>`
      )
      .join("");
  }

  function applyFilter() {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = term
      ? allLeads.filter((lead) =>
          [lead.nome, lead.cidade, lead.distrito, lead.curso, lead.telefone]
            .join(" ")
            .toLowerCase()
            .includes(term)
        )
      : allLeads;
    render(filtered);
    totalCount.textContent = `${filtered.length} de ${allLeads.length} leads`;
  }

  async function loadLeads() {
    try {
      const snapshot = await db.collection("leads").orderBy("created_at", "desc").get();
      allLeads = snapshot.docs.map((doc) => {
        const data = doc.data();
        const createdAt = data.created_at && typeof data.created_at.toDate === "function"
          ? data.created_at.toDate().toISOString()
          : null;
        return { id: doc.id, ...data, created_at: createdAt };
      });
      applyFilter();
    } catch (err) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="admin-table__empty">Não foi possível carregar os leads. ' +
        "Verifique se seu e-mail está autorizado nas regras do Firestore.</td></tr>";
    }
  }

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "/admin/";
      return;
    }
    loadLeads();
  });

  searchInput.addEventListener("input", applyFilter);

  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "/admin/";
  });

  const EXPORT_COLUMNS = [
    { key: "nome", label: "Nome" },
    { key: "telefone", label: "Telefone" },
    { key: "idade", label: "Idade" },
    { key: "curso", label: "Curso de Interesse" },
    { key: "cidade", label: "Cidade" },
    { key: "distrito", label: "Distrito" },
    { key: "created_at", label: "Cadastro" },
  ];

  function leadsForExport() {
    return allLeads.map((lead) => {
      const row = {};
      EXPORT_COLUMNS.forEach((col) => {
        row[col.label] = col.key === "created_at" ? formatDate(lead[col.key]) : lead[col.key];
      });
      return row;
    });
  }

  exportXlsxBtn.addEventListener("click", () => {
    const rows = leadsForExport();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "leads-sonhando-alto.xlsx");
  });

  exportPdfBtn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Leads - Sonhando Alto", 14, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} — total: ${allLeads.length}`, 14, 21);

    doc.autoTable({
      startY: 26,
      head: [EXPORT_COLUMNS.map((c) => c.label)],
      body: allLeads.map((lead) =>
        EXPORT_COLUMNS.map((col) => (col.key === "created_at" ? formatDate(lead[col.key]) : lead[col.key]))
      ),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [18, 41, 77] },
    });

    doc.save("leads-sonhando-alto.pdf");
  });
})();
