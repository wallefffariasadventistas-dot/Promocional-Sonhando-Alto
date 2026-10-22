(function () {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginBtn = document.getElementById("login-btn");
  const loginMessageEl = document.getElementById("login-message");

  const tbody = document.getElementById("leads-tbody");
  const searchInput = document.getElementById("search-input");
  const totalCount = document.getElementById("total-count");
  const logoutBtn = document.getElementById("logout-btn");
  const exportXlsxBtn = document.getElementById("export-xlsx-btn");
  const exportPdfBtn = document.getElementById("export-pdf-btn");

  const auth = firebase.auth();
  const db = firebase.firestore();
  const provider = new firebase.auth.GoogleAuthProvider();

  let allLeads = [];
  let leadsLoadedForUid = null;

  function setLoginMessage(text, type) {
    loginMessageEl.textContent = text;
    loginMessageEl.className = "form-message" + (type ? ` form-message--${type}` : "");
  }

  function resetLoginButton() {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar com Google";
  }

  function showLogin() {
    dashboardView.hidden = true;
    loginView.hidden = false;
    resetLoginButton();
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
  }

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
    tbody.innerHTML = '<tr><td colspan="7" class="admin-table__empty">Carregando...</td></tr>';
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
      leadsLoadedForUid = null;
      showLogin();
      return;
    }
    try {
      localStorage.removeItem("ga_auto_retry_done");
    } catch (e) {
      // ignora se o storage estiver bloqueado
    }
    showDashboard();
    if (leadsLoadedForUid !== user.uid) {
      leadsLoadedForUid = user.uid;
      loadLeads();
    }
  });

  // Trata o retorno do Google depois do redirecionamento.
  auth.getRedirectResult().catch((err) => {
    const isMissingInitialState =
      err.code === "auth/missing-initial-state" ||
      err.code === "auth/web-storage-unsupported" ||
      (err.message && err.message.indexOf("missing initial state") !== -1);

    // Esse erro é um bug conhecido do Safari/iOS com sessionStorage durante o
    // redirecionamento do Google (o próprio sessionStorage é a parte que falha
    // aqui, por isso usamos localStorage para controlar a nova tentativa). Na
    // prática, tentar de novo uma vez resolve sozinho na maioria dos casos,
    // então refazemos automaticamente antes de incomodar o usuário com um erro.
    let alreadyRetried = false;
    try {
      alreadyRetried = localStorage.getItem("ga_auto_retry_done") === "1";
    } catch (e) {
      alreadyRetried = false;
    }

    if (isMissingInitialState && !alreadyRetried) {
      try {
        localStorage.setItem("ga_auto_retry_done", "1");
      } catch (e) {
        // ignora se o storage estiver bloqueado
      }
      setLoginMessage("Ajustando o acesso, aguarde...", "");
      auth.signInWithRedirect(provider).catch(() => {
        setLoginMessage(
          "Não foi possível entrar. Toque em \"Entrar com Google\" novamente.",
          "error"
        );
        resetLoginButton();
      });
      return;
    }

    if (isMissingInitialState) {
      try {
        localStorage.removeItem("ga_auto_retry_done");
      } catch (e) {
        // ignora se o storage estiver bloqueado
      }
      setLoginMessage(
        "O Safari bloqueou o login na primeira tentativa. Toque em \"Entrar com Google\" novamente — na segunda vez costuma funcionar.",
        "error"
      );
    } else if (err && err.code !== "auth/no-auth-event") {
      // "auth/no-auth-event" só significa "a página carregou sem vir de um
      // redirect" — não é um erro de verdade, então não mostramos nada.
      setLoginMessage(err.message || "Não foi possível entrar com o Google.", "error");
    }
    resetLoginButton();
  });

  loginBtn.addEventListener("click", () => {
    setLoginMessage("", "");
    loginBtn.disabled = true;
    loginBtn.textContent = "Redirecionando para o Google...";

    auth.signInWithRedirect(provider).catch((err) => {
      setLoginMessage(err.message || "Não foi possível iniciar o login.", "error");
      resetLoginButton();
    });
  });

  searchInput.addEventListener("input", applyFilter);

  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
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
