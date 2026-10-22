(async function () {
  const { db, esc } = PL;
  const view = document.getElementById("view");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  const { user: me } = await PL.requireSession({ admin: true });
  await PL.loadConfig();
  document.getElementById("sair").onclick = PL.logout;
  const TS = () => firebase.firestore.FieldValue.serverTimestamp();

  let modulos = [], aulas = [], usuarios = [];
  let alunoFiltro = "pending", alunoBusca = "", aulaModFiltro = "";

  async function load() {
    const [m, a, u] = await Promise.all([
      db.collection("modulos").get(), db.collection("aulas").get(), db.collection("users").get(),
    ]);
    modulos = PL.snapList(m).sort(PL.byOrder);
    aulas = PL.snapList(a).sort(PL.byOrder);
    usuarios = PL.snapList(u).sort((x, y) => String(x.nome).localeCompare(String(y.nome), "pt-BR"));
    const pend = usuarios.filter((x) => x.status === "pending").length;
    const pc = document.getElementById("pend-count");
    pc.textContent = pend; pc.hidden = !pend;
  }

  // ---- utilidades de UI ----
  function openModal(html) {
    modalBody.innerHTML = html;
    if (!modal.open) modal.showModal();
    return modalBody;
  }
  const closeModal = () => modal.open && modal.close();
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  const saving = async (btn, fn) => {
    btn.disabled = true;
    try { await fn(); } catch (e) { PL.toast(PL.authError(e), "error"); }
    btn.disabled = false;
  };
  const nomeModulo = (id) => (modulos.find((m) => m.id === id) || {}).titulo || "—";
  const bar = (pct) => `<div class="bar"><div class="bar__fill" style="width:${pct}%"></div></div>`;

  // Troca a `ordem` de um item com o vizinho (dir = -1 sobe, +1 desce)
  async function mover(col, lista, id, dir) {
    const i = lista.findIndex((x) => x.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= lista.length) return;
    // normaliza a ordem para 1..n e troca
    const nova = lista.map((x, k) => ({ id: x.id, ordem: k + 1 }));
    [nova[i].ordem, nova[j].ordem] = [nova[j].ordem, nova[i].ordem];
    const batch = db.batch();
    nova.forEach((x) => batch.update(db.collection(col).doc(x.id), { ordem: x.ordem }));
    await batch.commit();
    await load(); route();
  }

  // ================= PAINEL =================
  function renderPainel() {
    const alunos = usuarios.filter((u) => u.role !== "admin");
    const pend = alunos.filter((u) => u.status === "pending");
    const totalAulas = aulas.filter((a) => a.publicado).length;
    view.innerHTML = `
      <section class="section"><h1>Painel</h1>
        <div class="stats">
          <div class="stat"><b>${alunos.filter((u) => u.status === "approved").length}</b><span>alunos ativos</span></div>
          <div class="stat ${pend.length ? "stat--alert" : ""}"><b>${pend.length}</b><span>aguardando aprovação</span></div>
          <div class="stat"><b>${modulos.length}</b><span>módulos</span></div>
          <div class="stat"><b>${totalAulas}</b><span>aulas publicadas</span></div>
        </div>
        ${pend.length ? `<div class="panel"><div class="row-between"><h3>Cadastros pendentes</h3><a href="#/alunos" class="btn btn--primary btn--sm">Revisar</a></div>
          <ul class="plain">${pend.slice(0, 5).map((u) => `<li>${esc(u.nome)} <span class="muted">· ${esc(u.email)}</span></li>`).join("")}</ul></div>` : ""}
        <div class="panel"><h3>Comece por aqui</h3>
          <ol class="steps">
            <li>Crie os <a href="#/modulos">módulos</a> do curso.</li>
            <li>Adicione as <a href="#/aulas">aulas</a> colando o link do vídeo (YouTube, Vimeo, Google Drive ou arquivo .mp4).</li>
            <li>Aprove os <a href="#/alunos">alunos</a> que se cadastrarem, ou cadastre-os você mesmo.</li>
            <li>Personalize nome, cores e mensagens em <a href="#/config">Configurações</a>.</li>
          </ol></div>
      </section>`;
  }

  // ================= MÓDULOS =================
  function moduloForm(m) {
    const isNew = !m;
    m = m || { titulo: "", descricao: "", capaUrl: "", publicado: true };
    const b = openModal(`
      <form class="form" id="f">
        <h2>${isNew ? "Novo módulo" : "Editar módulo"}</h2>
        <label class="field"><span>Título</span><input name="titulo" required maxlength="120" value="${esc(m.titulo)}" /></label>
        <label class="field"><span>Descrição</span><textarea name="descricao" rows="3" maxlength="600">${esc(m.descricao)}</textarea></label>
        <label class="field"><span>Imagem de capa (URL, opcional)</span><input name="capaUrl" type="url" placeholder="https://..." value="${esc(m.capaUrl)}" /></label>
        <label class="check-line"><input type="checkbox" name="publicado" ${m.publicado ? "checked" : ""} /> Publicado (visível para os alunos)</label>
        <div class="actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" type="submit">Salvar</button></div>
      </form>`);
    b.querySelector("[data-close]").onclick = closeModal;
    b.querySelector("#f").onsubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      saving(f.querySelector("[type=submit]"), async () => {
        const data = { titulo: f.titulo.value.trim(), descricao: f.descricao.value.trim(),
          capaUrl: f.capaUrl.value.trim(), publicado: f.publicado.checked };
        if (isNew) await db.collection("modulos").add({ ...data, ordem: modulos.length + 1, created_at: TS() });
        else await db.collection("modulos").doc(m.id).update(data);
        closeModal(); PL.toast("Módulo salvo.", "ok"); await load(); route();
      });
    };
  }

  function renderModulos() {
    view.innerHTML = `<section class="section">
      <div class="row-between"><h1>Módulos</h1><button class="btn btn--primary" id="novo">+ Novo módulo</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Ordem</th><th>Título</th><th>Aulas</th><th>Status</th><th></th></tr></thead><tbody>
      ${modulos.map((m, i) => `<tr>
        <td class="nowrap"><button class="icon" data-up="${m.id}" ${i === 0 ? "disabled" : ""} title="Subir">▲</button><button class="icon" data-down="${m.id}" ${i === modulos.length - 1 ? "disabled" : ""} title="Descer">▼</button></td>
        <td><b>${esc(m.titulo)}</b><br><small class="muted">${esc(m.descricao || "")}</small></td>
        <td>${aulas.filter((a) => a.moduloId === m.id).length}</td>
        <td><button class="badge ${m.publicado ? "badge--ok" : ""}" data-pub="${m.id}">${m.publicado ? "Publicado" : "Rascunho"}</button></td>
        <td class="nowrap"><a class="btn btn--ghost btn--sm" href="#/aulas" data-filtro="${m.id}">Aulas</a> <button class="btn btn--ghost btn--sm" data-edit="${m.id}">Editar</button> <button class="btn btn--danger btn--sm" data-del="${m.id}">Excluir</button></td>
      </tr>`).join("") || '<tr><td colspan="5" class="empty">Nenhum módulo ainda.</td></tr>'}
      </tbody></table></div></section>`;
    view.querySelector("#novo").onclick = () => moduloForm();
    view.querySelectorAll("[data-up]").forEach((b) => (b.onclick = () => mover("modulos", modulos, b.dataset.up, -1)));
    view.querySelectorAll("[data-down]").forEach((b) => (b.onclick = () => mover("modulos", modulos, b.dataset.down, 1)));
    view.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => moduloForm(modulos.find((m) => m.id === b.dataset.edit))));
    view.querySelectorAll("[data-filtro]").forEach((b) => (b.onclick = () => (aulaModFiltro = b.dataset.filtro)));
    view.querySelectorAll("[data-pub]").forEach((b) => (b.onclick = async () => {
      const m = modulos.find((x) => x.id === b.dataset.pub);
      await db.collection("modulos").doc(m.id).update({ publicado: !m.publicado });
      await load(); route();
    }));
    view.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      const m = modulos.find((x) => x.id === b.dataset.del);
      const n = aulas.filter((a) => a.moduloId === m.id).length;
      if (!confirm(`Excluir o módulo "${m.titulo}"${n ? ` e suas ${n} aula(s)` : ""}? Isso não pode ser desfeito.`)) return;
      const batch = db.batch();
      aulas.filter((a) => a.moduloId === m.id).forEach((a) => batch.delete(db.collection("aulas").doc(a.id)));
      batch.delete(db.collection("modulos").doc(m.id));
      await batch.commit();
      PL.toast("Módulo excluído."); await load(); route();
    }));
  }

  // ================= AULAS =================
  const materiaisToText = (l) => (l || []).map((x) => `${x.nome} | ${x.url}`).join("\n");
  const textToMateriais = (t) => t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [nome, ...rest] = l.split("|");
    return rest.length ? { nome: nome.trim(), url: rest.join("|").trim() } : { nome: l, url: l };
  }).filter((x) => /^https?:\/\//i.test(x.url));

  function aulaForm(a) {
    if (!modulos.length) return PL.toast("Crie um módulo antes de adicionar aulas.", "error");
    const isNew = !a;
    a = a || { titulo: "", descricao: "", videoUrl: "", duracaoMin: "", materiais: [], publicado: true, moduloId: aulaModFiltro || modulos[0].id };
    const b = openModal(`
      <form class="form" id="f">
        <h2>${isNew ? "Nova aula" : "Editar aula"}</h2>
        <label class="field"><span>Módulo</span><select name="moduloId">${modulos.map((m) => `<option value="${m.id}" ${m.id === a.moduloId ? "selected" : ""}>${esc(m.titulo)}</option>`).join("")}</select></label>
        <label class="field"><span>Título da aula</span><input name="titulo" required maxlength="150" value="${esc(a.titulo)}" /></label>
        <label class="field"><span>Link do vídeo</span><input name="videoUrl" required placeholder="YouTube, Vimeo, Google Drive ou .mp4" value="${esc(a.videoUrl)}" />
          <small class="muted">Dica: use YouTube "não listado" — o aluno assiste sem sair da plataforma e a aula é marcada como concluída automaticamente ao final.</small></label>
        <div id="prev" class="preview"></div>
        <label class="field"><span>Duração (minutos, opcional)</span><input name="duracaoMin" type="number" min="0" max="600" value="${esc(a.duracaoMin)}" /></label>
        <label class="field"><span>Descrição</span><textarea name="descricao" rows="4" maxlength="3000">${esc(a.descricao)}</textarea></label>
        <label class="field"><span>Materiais de apoio (um por linha: <code>Nome | https://link</code>)</span><textarea name="materiais" rows="3" placeholder="Apostila | https://...">${esc(materiaisToText(a.materiais))}</textarea></label>
        <label class="check-line"><input type="checkbox" name="publicado" ${a.publicado ? "checked" : ""} /> Publicada (visível para os alunos)</label>
        <div class="actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" type="submit">Salvar</button></div>
      </form>`);
    const f = b.querySelector("#f"), prev = b.querySelector("#prev");
    const showPrev = () => {
      const v = PL.parseVideo(f.videoUrl.value);
      prev.innerHTML = v ? `<span class="badge badge--ok">Vídeo reconhecido: ${v.type === "youtube" ? "YouTube" : v.type === "vimeo" ? "Vimeo" : v.type === "drive" ? "Google Drive" : v.type === "file" ? "arquivo de vídeo" : "link externo"}</span>`
        : f.videoUrl.value ? '<span class="badge">Link não reconhecido — use https://</span>' : "";
    };
    f.videoUrl.oninput = showPrev; showPrev();
    b.querySelector("[data-close]").onclick = closeModal;
    f.onsubmit = (e) => {
      e.preventDefault();
      if (!PL.parseVideo(f.videoUrl.value)) return PL.toast("Informe um link de vídeo válido (https://).", "error");
      saving(f.querySelector("[type=submit]"), async () => {
        const data = { moduloId: f.moduloId.value, titulo: f.titulo.value.trim(), descricao: f.descricao.value.trim(),
          videoUrl: f.videoUrl.value.trim(), duracaoMin: Number(f.duracaoMin.value) || 0,
          materiais: textToMateriais(f.materiais.value), publicado: f.publicado.checked };
        if (isNew) {
          const ordem = Math.max(0, ...aulas.filter((x) => x.moduloId === data.moduloId).map((x) => x.ordem || 0)) + 1;
          await db.collection("aulas").add({ ...data, ordem, created_at: TS() });
        } else {
          if (data.moduloId !== a.moduloId) data.ordem = Math.max(0, ...aulas.filter((x) => x.moduloId === data.moduloId).map((x) => x.ordem || 0)) + 1;
          await db.collection("aulas").doc(a.id).update(data);
        }
        aulaModFiltro = data.moduloId;
        closeModal(); PL.toast("Aula salva.", "ok"); await load(); route();
      });
    };
  }

  function renderAulas() {
    const lista = aulas.filter((a) => !aulaModFiltro || a.moduloId === aulaModFiltro);
    view.innerHTML = `<section class="section">
      <div class="row-between"><h1>Aulas</h1><button class="btn btn--primary" id="nova">+ Nova aula</button></div>
      <div class="toolbar"><select id="filtro"><option value="">Todos os módulos</option>${modulos.map((m) => `<option value="${m.id}" ${m.id === aulaModFiltro ? "selected" : ""}>${esc(m.titulo)}</option>`).join("")}</select></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Ordem</th><th>Aula</th><th>Módulo</th><th>Status</th><th></th></tr></thead><tbody>
      ${lista.map((a, i) => {
        const irmas = aulas.filter((x) => x.moduloId === a.moduloId), k = irmas.findIndex((x) => x.id === a.id);
        return `<tr>
          <td class="nowrap"><button class="icon" data-up="${a.id}" ${k === 0 ? "disabled" : ""}>▲</button><button class="icon" data-down="${a.id}" ${k === irmas.length - 1 ? "disabled" : ""}>▼</button></td>
          <td><b>${esc(a.titulo)}</b><br><small class="muted">${a.duracaoMin ? a.duracaoMin + " min · " : ""}${esc(a.videoUrl)}</small></td>
          <td>${esc(nomeModulo(a.moduloId))}</td>
          <td><button class="badge ${a.publicado ? "badge--ok" : ""}" data-pub="${a.id}">${a.publicado ? "Publicada" : "Rascunho"}</button></td>
          <td class="nowrap"><button class="btn btn--ghost btn--sm" data-edit="${a.id}">Editar</button> <button class="btn btn--danger btn--sm" data-del="${a.id}">Excluir</button></td></tr>`;
      }).join("") || '<tr><td colspan="5" class="empty">Nenhuma aula ainda.</td></tr>'}
      </tbody></table></div></section>`;
    view.querySelector("#nova").onclick = () => aulaForm();
    view.querySelector("#filtro").onchange = (e) => { aulaModFiltro = e.target.value; renderAulas(); };
    const irmasDe = (id) => aulas.filter((x) => x.moduloId === aulas.find((y) => y.id === id).moduloId);
    view.querySelectorAll("[data-up]").forEach((b) => (b.onclick = () => mover("aulas", irmasDe(b.dataset.up), b.dataset.up, -1)));
    view.querySelectorAll("[data-down]").forEach((b) => (b.onclick = () => mover("aulas", irmasDe(b.dataset.down), b.dataset.down, 1)));
    view.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => aulaForm(aulas.find((x) => x.id === b.dataset.edit))));
    view.querySelectorAll("[data-pub]").forEach((b) => (b.onclick = async () => {
      const a = aulas.find((x) => x.id === b.dataset.pub);
      await db.collection("aulas").doc(a.id).update({ publicado: !a.publicado });
      await load(); route();
    }));
    view.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      const a = aulas.find((x) => x.id === b.dataset.del);
      if (!confirm(`Excluir a aula "${a.titulo}"?`)) return;
      await db.collection("aulas").doc(a.id).delete();
      PL.toast("Aula excluída."); await load(); route();
    }));
  }

  // ================= ALUNOS =================
  const STATUS = { pending: "Pendente", approved: "Aprovado", blocked: "Bloqueado" };

  async function progressoModal(u) {
    const b = openModal(`<h2>${esc(u.nome)}</h2><p class="muted">Carregando progresso…</p>`);
    const snap = await db.collection("users").doc(u.id).collection("progresso").get();
    const done = {}; snap.docs.forEach((d) => (done[d.id] = d.data().concluida_em));
    const pub = aulas.filter((a) => a.publicado);
    const feitas = pub.filter((a) => done[a.id]).length, pct = pub.length ? Math.round((feitas / pub.length) * 100) : 0;
    b.innerHTML = `<h2>${esc(u.nome)}</h2><p class="muted">${esc(u.email)}</p>
      <p><b>${pct}%</b> concluído — ${feitas} de ${pub.length} aulas</p>${bar(pct)}
      <div class="modal-scroll">${modulos.map((m) => `<h3>${esc(m.titulo)}</h3><ul class="plain">${
        pub.filter((a) => a.moduloId === m.id).map((a) => `<li>${done[a.id] ? "✅" : "⬜"} ${esc(a.titulo)} ${done[a.id] ? `<small class="muted">· ${PL.fmtDate(done[a.id])}</small>` : ""}</li>`).join("") || "<li class='muted'>Sem aulas.</li>"}</ul>`).join("")}</div>
      <div class="actions"><button class="btn btn--ghost" data-close>Fechar</button></div>`;
    b.querySelector("[data-close]").onclick = closeModal;
  }

  // Cria conta de aluno sem deslogar o admin (usa um app Firebase secundário).
  async function criarAluno(f) {
    const app = firebase.apps.find((a) => a.name === "cadastro") || firebase.initializeApp(firebase.app().options, "cadastro");
    const sec = app.auth();
    const cred = await sec.createUserWithEmailAndPassword(f.email.value.trim(), f.senha.value);
    await sec.signOut();
    await db.collection("users").doc(cred.user.uid).set({
      nome: f.nome.value.trim(), email: cred.user.email, telefone: f.telefone.value.trim(),
      status: "approved", role: "student", created_at: TS(),
    });
  }

  function alunoForm() {
    const b = openModal(`
      <form class="form" id="f"><h2>Cadastrar aluno</h2>
        <label class="field"><span>Nome completo</span><input name="nome" required maxlength="120" /></label>
        <label class="field"><span>Telefone / WhatsApp</span><input name="telefone" maxlength="30" /></label>
        <label class="field"><span>E-mail</span><input name="email" type="email" required /></label>
        <label class="field"><span>Senha inicial (mín. 6)</span><input name="senha" type="text" minlength="6" required /></label>
        <p class="hint">O aluno já entra aprovado. Passe o e-mail e a senha para ele — ele poderá trocar a senha em "Esqueci minha senha".</p>
        <div class="actions"><button type="button" class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" type="submit">Cadastrar</button></div>
      </form>`);
    b.querySelector("[data-close]").onclick = closeModal;
    b.querySelector("#f").onsubmit = (e) => {
      e.preventDefault();
      saving(e.target.querySelector("[type=submit]"), async () => {
        await criarAluno(e.target);
        closeModal(); PL.toast("Aluno cadastrado.", "ok"); await load(); route();
      });
    };
  }

  function renderAlunos() {
    const cont = (s) => usuarios.filter((u) => u.status === s).length;
    const q = alunoBusca.toLowerCase();
    const lista = usuarios.filter((u) => u.status === alunoFiltro &&
      (!q || (u.nome + " " + u.email).toLowerCase().includes(q)));
    view.innerHTML = `<section class="section">
      <div class="row-between"><h1>Alunos</h1><button class="btn btn--primary" id="novo">+ Cadastrar aluno</button></div>
      <div class="tabs tabs--inline">${Object.keys(STATUS).map((s) => `<button class="tab ${s === alunoFiltro ? "is-active" : ""}" data-s="${s}">${STATUS[s]}s (${cont(s)})</button>`).join("")}</div>
      <div class="toolbar"><input id="busca" type="search" placeholder="Buscar por nome ou e-mail" value="${esc(alunoBusca)}" /></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Contato</th><th>Cadastro</th><th>Perfil</th><th></th></tr></thead><tbody>
      ${lista.map((u) => `<tr>
        <td><b>${esc(u.nome)}</b></td>
        <td>${esc(u.email)}<br><small class="muted">${esc(u.telefone || "")}</small></td>
        <td>${PL.fmtDate(u.created_at)}</td>
        <td>${u.role === "admin" ? '<span class="badge badge--ok">Admin</span>' : "Aluno"}</td>
        <td class="nowrap">
          ${u.status === "pending" ? `<button class="btn btn--primary btn--sm" data-act="approved" data-id="${u.id}">Aprovar</button> <button class="btn btn--danger btn--sm" data-act="reject" data-id="${u.id}">Recusar</button>` : ""}
          ${u.status === "approved" && u.id !== me.uid ? `<button class="btn btn--ghost btn--sm" data-prog="${u.id}">Progresso</button> <button class="btn btn--ghost btn--sm" data-act="blocked" data-id="${u.id}">Bloquear</button> <button class="btn btn--ghost btn--sm" data-role="${u.id}">${u.role === "admin" ? "Tornar aluno" : "Tornar admin"}</button>` : ""}
          ${u.status === "blocked" ? `<button class="btn btn--ghost btn--sm" data-act="approved" data-id="${u.id}">Desbloquear</button> <button class="btn btn--danger btn--sm" data-act="reject" data-id="${u.id}">Remover</button>` : ""}
        </td></tr>`).join("") || '<tr><td colspan="5" class="empty">Nenhum registro.</td></tr>'}
      </tbody></table></div></section>`;
    view.querySelector("#novo").onclick = alunoForm;
    view.querySelectorAll("[data-s]").forEach((t) => (t.onclick = () => { alunoFiltro = t.dataset.s; renderAlunos(); }));
    view.querySelector("#busca").oninput = (e) => {
      alunoBusca = e.target.value; const pos = e.target.selectionStart; renderAlunos();
      const i = view.querySelector("#busca"); i.focus(); i.setSelectionRange(pos, pos);
    };
    view.querySelectorAll("[data-prog]").forEach((b) => (b.onclick = () => progressoModal(usuarios.find((u) => u.id === b.dataset.prog))));
    view.querySelectorAll("[data-role]").forEach((b) => (b.onclick = async () => {
      const u = usuarios.find((x) => x.id === b.dataset.role);
      const novo = u.role === "admin" ? "student" : "admin";
      if (!confirm(`${novo === "admin" ? "Dar acesso de administrador a" : "Remover acesso de administrador de"} ${u.nome}?`)) return;
      await db.collection("users").doc(u.id).update({ role: novo });
      await load(); route();
    }));
    view.querySelectorAll("[data-act]").forEach((b) => (b.onclick = async () => {
      const u = usuarios.find((x) => x.id === b.dataset.id), act = b.dataset.act;
      try {
        if (act === "reject") {
          if (!confirm(`Remover o cadastro de ${u.nome}? (Ele poderá se cadastrar de novo com outro e-mail.)`)) return;
          await db.collection("users").doc(u.id).delete();
        } else {
          await db.collection("users").doc(u.id).update({ status: act });
          PL.toast(act === "approved" ? `${u.nome} aprovado(a).` : `${u.nome} bloqueado(a).`, "ok");
        }
        await load(); route();
      } catch (e) { PL.toast(PL.authError(e), "error"); }
    }));
  }

  // ================= CONFIGURAÇÕES =================
  function renderConfig() {
    const c = PL.config;
    view.innerHTML = `<section class="section"><h1>Configurações</h1>
      <form class="form panel" id="f">
        <label class="field"><span>Nome da plataforma</span><input name="nome" required maxlength="80" value="${esc(c.nome)}" /></label>
        <label class="field"><span>Subtítulo / mensagem de boas-vindas</span><input name="subtitulo" maxlength="200" value="${esc(c.subtitulo)}" /></label>
        <label class="field"><span>Cor de destaque</span><input name="cor" type="color" value="${esc(c.cor)}" /></label>
        <label class="field"><span>Logo (URL da imagem, opcional)</span><input name="logoUrl" type="url" placeholder="https://..." value="${esc(c.logoUrl)}" /></label>
        <label class="field"><span>Imagem de fundo da página inicial (URL, opcional)</span><input name="bannerUrl" type="url" placeholder="https://..." value="${esc(c.bannerUrl)}" /></label>
        <label class="field"><span>Mensagem para alunos aguardando aprovação</span><textarea name="mensagemPendente" rows="3" maxlength="400">${esc(c.mensagemPendente)}</textarea></label>
        <label class="field"><span>Texto do rodapé</span><input name="rodape" maxlength="120" value="${esc(c.rodape)}" /></label>
        <label class="check-line"><input type="checkbox" name="cadastroAberto" ${c.cadastroAberto ? "checked" : ""} /> Permitir que novas pessoas peçam cadastro (desmarque para aceitar somente alunos cadastrados por você)</label>
        <div class="actions"><button class="btn btn--primary" type="submit">Salvar configurações</button></div>
      </form></section>`;
    const f = view.querySelector("#f");
    f.cor.oninput = () => document.documentElement.style.setProperty("--accent", f.cor.value);
    f.onsubmit = (e) => {
      e.preventDefault();
      saving(f.querySelector("[type=submit]"), async () => {
        const data = { nome: f.nome.value.trim(), subtitulo: f.subtitulo.value.trim(), cor: f.cor.value,
          logoUrl: f.logoUrl.value.trim(), bannerUrl: f.bannerUrl.value.trim(), mensagemPendente: f.mensagemPendente.value.trim(),
          rodape: f.rodape.value.trim(), cadastroAberto: f.cadastroAberto.checked };
        await db.collection("config").doc("plataforma").set(data);
        PL.config = { ...PL.DEFAULTS, ...data }; PL.applyTheme();
        PL.toast("Configurações salvas.", "ok");
      });
    };
  }

  function route() {
    window.scrollTo(0, 0);
    const page = (location.hash || "#/").split("/")[1] || "";
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("is-active", a.dataset.nav === page));
    ({ modulos: renderModulos, aulas: renderAulas, alunos: renderAlunos, config: renderConfig }[page] || renderPainel)();
  }

  try { await load(); } catch (e) {
    view.innerHTML = `<div class="empty">Erro ao carregar dados: ${esc(PL.authError(e))}</div>`; return;
  }
  window.addEventListener("hashchange", () => { closeModal(); route(); });
  route();
})();
