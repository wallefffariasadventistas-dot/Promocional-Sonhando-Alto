(function () {
  const tbody = document.getElementById("leads-tbody");
  const searchInput = document.getElementById("search-input");
  const totalCount = document.getElementById("total-count");
  const logoutBtn = document.getElementById("logout-btn");

  let allLeads = [];

  function formatDate(isoString) {
    const date = new Date(isoString.replace(" ", "T") + "Z");
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
    const response = await fetch("/api/admin/leads");
    if (response.status === 401) {
      window.location.href = "/admin/";
      return;
    }
    const data = await response.json();
    allLeads = data.leads || [];
    applyFilter();
  }

  searchInput.addEventListener("input", applyFilter);

  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    await firebase.auth().signOut().catch(() => {});
    window.location.href = "/admin/";
  });

  loadLeads();
})();
