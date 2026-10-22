(function () {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginBtn = document.getElementById("login-btn");
  const loginMessageEl = document.getElementById("login-message");

  const tabLeadsBtn = document.getElementById("tab-leads-btn");
  const tabContactedBtn = document.getElementById("tab-contacted-btn");
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
  let allContacted = [];
  let currentView = "leads"; // "leads" | "contactados"
  let leadsLoadedForUid = null;

  function currentList() {
    return currentView === "leads" ? allLeads : allContacted;
  }

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

  function actionsCell(lead) {
    const deleteBtn = `<button type="button" class="admin-row-btn admin-row-btn--danger" data-action="delete" data-id="${escapeHtml(lead.id)}">Excluir</button>`;
    if (currentView === "leads") {
      return `<button type="button" class="admin-row-btn" data-action="contact" data-id="${escapeHtml(lead.id)}">Marcar como contactado</button>${deleteBtn}`;
    }
    return deleteBtn;
  }

  function render(leads) {
    if (leads.length === 0) {
      const emptyText = currentView === "leads" ? "Nenhum lead encontrado." : "Nenhum contato encontrado.";
      tbody.innerHTML = `<tr><td colspan="8" class="admin-table__empty">${emptyText}</td></tr>`;
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
          <td class="admin-table__actions">${actionsCell(lead)}</td>
        </tr>`
      )
      .join("");
  }

  function applyFilter() {
    const list = currentList();
    const term = searchInput.value.trim().toLowerCase();
    const filtered = term
      ? list.filter((lead) =>
          [lead.nome, lead.cidade, lead.distrito, lead.curso, lead.telefone]
            .join(" ")
            .toLowerCase()
            .includes(term)
        )
      : list;
    render(filtered);
    const label = currentView === "leads" ? "leads" : "contactados";
    totalCount.textContent = `${filtered.length} de ${list.length} ${label}`;
  }

  function switchView(view) {
    currentView = view;
    tabLeadsBtn.classList.toggle("is-active", view === "leads");
    tabContactedBtn.classList.toggle("is-active", view === "contactados");
    searchInput.value = "";
    applyFilter();
  }

  async function loadLeads() {
    try {
      const snapshot = await db.collection("leads").orderBy("created_at", "desc").get();
      allLeads = snapshot.docs.map((doc) => {
        const data = doc.data();
        const createdAt = data.created_at && typeof data.created_at.toDate === "function"
          ? data.created_at.toDate().toISOString()
          : data.created_at || null;
        return { id: doc.id, ...data, created_at: createdAt };
      });
    } catch (err) {
      allLeads = [];
      if (currentView === "leads") {
        tbody.innerHTML =
          '<tr><td colspan="8" class="admin-table__empty">Não foi possível carregar os leads. ' +
          "Verifique se seu e-mail está autorizado nas regras do Firestore.</td></tr>";
        return;
      }
    }
    applyFilter();
  }

  async function loadContacted() {
    try {
      const snapshot = await db.collection("contactados").orderBy("contactado_em", "desc").get();
      allContacted = snapshot.docs.map((doc) => {
        const data = doc.data();
        const contactadoEm = data.contactado_em && typeof data.contactado_em.toDate === "function"
          ? data.contactado_em.toDate().toISOString()
          : data.contactado_em || null;
        const createdAt = data.created_at && typeof data.created_at.toDate === "function"
          ? data.created_at.toDate().toISOString()
          : data.created_at || null;
        return { id: doc.id, ...data, created_at: createdAt, contactado_em: contactadoEm };
      });
    } catch (err) {
      allContacted = [];
      if (currentView === "contactados") {
        tbody.innerHTML =
          '<tr><td colspan="8" class="admin-table__empty">Não foi possível carregar os contactados.</td></tr>';
        return;
      }
    }
    applyFilter();
  }

  async function handleMarkContacted(id) {
    const lead = allLeads.find((l) => l.id === id);
    if (!lead) return;
    if (!confirm(`Mover "${lead.nome}" para a lista de contactados?`)) return;

    try {
      const batch = db.batch();
      batch.set(db.collection("contactados").doc(id), {
        nome: lead.nome,
        telefone: lead.telefone,
        idade: lead.idade,
        curso: lead.curso,
        cidade: lead.cidade,
        distrito: lead.distrito,
        created_at: lead.created_at,
        contactado_em: firebase.firestore.FieldValue.serverTimestamp(),
      });
      batch.delete(db.collection("leads").doc(id));
      await batch.commit();

      allLeads = allLeads.filter((l) => l.id !== id);
      allContacted = [{ ...lead, contactado_em: new Date().toISOString() }, ...allContacted];
      applyFilter();
    } catch (err) {
      alert("Não foi possível mover para contactados: " + (err.message || err));
    }
  }

  async function handleDelete(id) {
    const list = currentList();
    const lead = list.find((l) => l.id === id);
    if (!lead) return;
    if (!confirm(`Excluir o registro de "${lead.nome}" definitivamente? Essa ação não pode ser desfeita.`)) return;

    const collectionName = currentView === "leads" ? "leads" : "contactados";
    try {
      await db.collection(collectionName).doc(id).delete();
      if (currentView === "leads") {
        allLeads = allLeads.filter((l) => l.id !== id);
      } else {
        allContacted = allContacted.filter((l) => l.id !== id);
      }
      applyFilter();
    } catch (err) {
      alert("Não foi possível excluir: " + (err.message || err));
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
      switchView("leads");
      loadLeads();
      loadContacted();
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

  tabLeadsBtn.addEventListener("click", () => switchView("leads"));
  tabContactedBtn.addEventListener("click", () => switchView("contactados"));

  tbody.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (action === "delete") handleDelete(id);
    else if (action === "contact") handleMarkContacted(id);
  });

  searchInput.addEventListener("input", applyFilter);

  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
  });

  const BASE_EXPORT_COLUMNS = [
    { key: "nome", label: "Nome" },
    { key: "telefone", label: "Telefone" },
    { key: "idade", label: "Idade" },
    { key: "curso", label: "Curso de Interesse" },
    { key: "cidade", label: "Cidade" },
    { key: "distrito", label: "Distrito" },
    { key: "created_at", label: "Cadastro" },
  ];
  const CONTACTED_EXTRA_COLUMN = { key: "contactado_em", label: "Contactado em" };
  const DATE_KEYS = ["created_at", "contactado_em"];

  function exportColumns() {
    return currentView === "contactados"
      ? [...BASE_EXPORT_COLUMNS, CONTACTED_EXTRA_COLUMN]
      : BASE_EXPORT_COLUMNS;
  }

  function leadsForExport() {
    const columns = exportColumns();
    return currentList().map((lead) => {
      const row = {};
      columns.forEach((col) => {
        row[col.label] = DATE_KEYS.includes(col.key) ? formatDate(lead[col.key]) : lead[col.key];
      });
      return row;
    });
  }

  exportXlsxBtn.addEventListener("click", () => {
    const rows = leadsForExport();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const sheetName = currentView === "leads" ? "Leads" : "Contactados";
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const filename = currentView === "leads" ? "leads-sonhando-alto.xlsx" : "contactados-sonhando-alto.xlsx";
    XLSX.writeFile(workbook, filename);
  });

  exportPdfBtn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });
    const columns = exportColumns();
    const list = currentList();
    const title = currentView === "leads" ? "Leads - Sonhando Alto" : "Contactados - Sonhando Alto";

    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} — total: ${list.length}`, 14, 21);

    doc.autoTable({
      startY: 26,
      head: [columns.map((c) => c.label)],
      body: list.map((lead) =>
        columns.map((col) => (DATE_KEYS.includes(col.key) ? formatDate(lead[col.key]) : lead[col.key]))
      ),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [18, 41, 77] },
    });

    const filename = currentView === "leads" ? "leads-sonhando-alto.pdf" : "contactados-sonhando-alto.pdf";
    doc.save(filename);
  });
})();
