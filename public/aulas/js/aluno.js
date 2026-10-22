(async function () {
  const { db, esc } = PL;
  const view = document.getElementById("view");
  const { user, profile } = await PL.requireSession({ student: true });
  await PL.loadConfig();

  document.getElementById("user-name").textContent = profile.nome.split(" ")[0];
  document.getElementById("avatar").textContent = PL.initials(profile.nome);
  document.getElementById("sair").onclick = PL.logout;
  document.getElementById("rodape").textContent = "© " + new Date().getFullYear() + " " + PL.config.rodape;
  if (profile.role === "admin") document.getElementById("admin-link").hidden = false;

  const progRef = db.collection("users").doc(user.uid).collection("progresso");
  let modulos = [], aulas = [], done = {};
  try {
    const [m, a, p] = await Promise.all([
      db.collection("modulos").where("publicado", "==", true).get(),
      db.collection("aulas").where("publicado", "==", true).get(),
      progRef.get(),
    ]);
    modulos = PL.snapList(m).sort(PL.byOrder);
    aulas = PL.snapList(a).sort(PL.byOrder);
    p.docs.forEach((d) => (done[d.id] = true));
  } catch (e) {
    view.innerHTML = `<div class="empty">Não foi possível carregar as aulas: ${esc(PL.authError(e))}</div>`;
    return;
  }

  const aulasDe = (mid) => aulas.filter((a) => a.moduloId === mid);
  // Ordem global de estudo: módulo por módulo, aula por aula
  const sequencia = () => modulos.flatMap((m) => aulasDe(m.id));
  const stats = (list) => {
    const total = list.length, feitas = list.filter((a) => done[a.id]).length;
    return { total, feitas, pct: total ? Math.round((feitas / total) * 100) : 0 };
  };
  const bar = (pct) => `<div class="bar"><div class="bar__fill" style="width:${pct}%"></div></div>`;

  async function setDone(aulaId, value) {
    const ref = progRef.doc(aulaId);
    if (value) {
      if (done[aulaId]) return;
      done[aulaId] = true;
      await ref.set({ concluida_em: firebase.firestore.FieldValue.serverTimestamp() });
    } else {
      delete done[aulaId];
      await ref.delete();
    }
  }

  // ---------- Home ----------
  function renderHome() {
    const seq = sequencia();
    const geral = stats(seq);
    const proxima = seq.find((a) => !done[a.id]) || null;
    const c = PL.config;
    const banner = c.bannerUrl ? `style="background-image:linear-gradient(90deg,#0b0d12 25%,rgba(11,13,18,.55)),url('${esc(c.bannerUrl)}')"` : "";
    let html = `
      <section class="hero" ${banner}>
        <p class="eyebrow">Olá, ${esc(profile.nome.split(" ")[0])}!</p>
        <h1>${esc(c.nome)}</h1>
        <p class="hero__sub">${esc(c.subtitulo)}</p>
        <div class="hero__progress">
          <div class="hero__pct">${geral.pct}%</div>
          <div class="hero__bar">${bar(geral.pct)}<small>${geral.feitas} de ${geral.total} aulas concluídas</small></div>
        </div>
        ${proxima
          ? `<a class="btn btn--primary" href="#/aula/${proxima.id}">${geral.feitas ? "▶ Continuar de onde parei" : "▶ Começar agora"}</a>`
          : geral.total ? `<span class="badge badge--ok">🎉 Curso concluído! Parabéns!</span>` : ""}
      </section>
      <section class="section"><h2>Módulos do curso</h2>`;
    if (!modulos.length) html += `<div class="empty">Nenhum módulo publicado ainda. Volte em breve!</div>`;
    html += `<div class="grid">`;
    modulos.forEach((m, i) => {
      const s = stats(aulasDe(m.id));
      const primeira = aulasDe(m.id).find((a) => !done[a.id]) || aulasDe(m.id)[0];
      const capa = m.capaUrl
        ? `<img src="${esc(m.capaUrl)}" alt="" loading="lazy" />`
        : `<div class="card__cover-ph"><span>${i + 1}</span></div>`;
      html += `
        <a class="card" href="${primeira ? "#/modulo/" + m.id : "#/"}">
          <div class="card__cover">${capa}${s.pct === 100 ? '<span class="badge badge--ok card__flag">✓ Concluído</span>' : ""}</div>
          <div class="card__body">
            <small class="muted">Módulo ${i + 1} · ${s.total} aula${s.total === 1 ? "" : "s"}</small>
            <h3>${esc(m.titulo)}</h3>
            ${bar(s.pct)}<small class="muted">${s.pct}% concluído</small>
          </div>
        </a>`;
    });
    html += `</div></section>`;
    view.innerHTML = html;
  }

  // ---------- Módulo ----------
  function renderModulo(id) {
    const m = modulos.find((x) => x.id === id);
    if (!m) return void (location.hash = "#/");
    const lista = aulasDe(id), s = stats(lista);
    view.innerHTML = `
      <section class="section">
        <a class="back" href="#/">← Todos os módulos</a>
        <h1>${esc(m.titulo)}</h1>
        <p class="muted">${esc(m.descricao || "")}</p>
        ${bar(s.pct)}<small class="muted">${s.feitas} de ${s.total} aulas concluídas (${s.pct}%)</small>
        <ul class="lesson-list">
          ${lista.map((a, i) => `
            <li><a href="#/aula/${a.id}" class="lesson-row ${done[a.id] ? "is-done" : ""}">
              <span class="check">${done[a.id] ? "✓" : i + 1}</span>
              <span class="lesson-row__t">${esc(a.titulo)}</span>
              ${a.duracaoMin ? `<small class="muted">${a.duracaoMin} min</small>` : ""}
              <span class="lesson-row__play">▶</span>
            </a></li>`).join("") || '<li class="empty">Sem aulas neste módulo ainda.</li>'}
        </ul>
      </section>`;
  }

  // ---------- Aula ----------
  function renderAula(id) {
    const aula = aulas.find((x) => x.id === id);
    if (!aula) return void (location.hash = "#/");
    const seq = sequencia(), idx = seq.findIndex((x) => x.id === id);
    const prev = seq[idx - 1], next = seq[idx + 1];
    const mod = modulos.find((m) => m.id === aula.moduloId);
    const materiais = (aula.materiais || []).filter((x) => /^https?:\/\//i.test(x.url));

    view.innerHTML = `
      <div class="lesson">
        <div class="lesson__main">
          <div class="player" id="player"></div>
          <div class="lesson__bar">
            <div>
              <small class="muted">${esc(mod ? mod.titulo : "")}</small>
              <h1>${esc(aula.titulo)}</h1>
            </div>
            <button class="btn btn--primary" id="toggle" type="button"></button>
          </div>
          <div class="lesson__nav">
            ${prev ? `<a class="btn btn--ghost btn--sm" href="#/aula/${prev.id}">← Anterior</a>` : "<span></span>"}
            ${next ? `<a class="btn btn--ghost btn--sm" href="#/aula/${next.id}">Próxima →</a>` : "<span></span>"}
          </div>
          <div class="panel">
            <h3>Sobre esta aula</h3>
            <p class="pre">${esc(aula.descricao || "Sem descrição.")}</p>
            ${materiais.length ? `<h3>Materiais de apoio</h3><ul class="files">${materiais.map((f) =>
              `<li><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">📎 ${esc(f.nome || f.url)}</a></li>`).join("")}</ul>` : ""}
          </div>
        </div>
        <aside class="lesson__side">
          <div class="side__head"><strong>Conteúdo do curso</strong>
            <small class="muted" id="side-pct"></small><div id="side-bar"></div></div>
          ${modulos.map((m) => {
            const l = aulasDe(m.id), s = stats(l);
            return `<details class="acc" ${m.id === aula.moduloId ? "open" : ""}>
              <summary><span>${esc(m.titulo)}</span><small data-mod="${m.id}">${s.feitas}/${s.total}</small></summary>
              <ul>${l.map((a) => `<li><a href="#/aula/${a.id}" class="side__row ${a.id === id ? "is-current" : ""} ${done[a.id] ? "is-done" : ""}">
                <span class="check">${done[a.id] ? "✓" : ""}</span><span>${esc(a.titulo)}</span></a></li>`).join("")}</ul>
            </details>`;
          }).join("")}
        </aside>
      </div>`;

    const btn = document.getElementById("toggle");
    const paint = () => {
      btn.textContent = done[id] ? "✓ Aula concluída (desmarcar)" : "Marcar como concluída";
      btn.className = "btn " + (done[id] ? "btn--done" : "btn--primary");
      const g = stats(seq);
      document.getElementById("side-pct").textContent = g.pct + "% concluído";
      document.getElementById("side-bar").innerHTML = bar(g.pct);
      modulos.forEach((m) => {
        const c = stats(aulasDe(m.id)), el = document.querySelector(`[data-mod="${m.id}"]`);
        if (el) el.textContent = c.feitas + "/" + c.total;
      });
      document.querySelectorAll(".side__row").forEach((r) => {
        if (r.getAttribute("href") === "#/aula/" + id) {
          r.classList.toggle("is-done", !!done[id]);
          r.querySelector(".check").textContent = done[id] ? "✓" : "";
        }
      });
    };
    paint();
    btn.onclick = async () => {
      btn.disabled = true;
      try { await setDone(id, !done[id]); paint(); }
      catch (e) { PL.toast(PL.authError(e), "error"); }
      btn.disabled = false;
    };

    PL.mountPlayer(document.getElementById("player"), aula.videoUrl, async () => {
      if (done[id]) return;
      try {
        await setDone(id, true);
        paint();
        PL.toast("Aula concluída! ✓", "ok");
        if (next) setTimeout(() => { if (location.hash === "#/aula/" + id) location.hash = "#/aula/" + next.id; }, 2500);
      } catch (e) { PL.toast(PL.authError(e), "error"); }
    });
  }

  // ---------- Progresso ----------
  function renderProgresso() {
    const g = stats(sequencia());
    view.innerHTML = `
      <section class="section">
        <h1>Meu progresso</h1>
        <div class="stats">
          <div class="stat"><b>${g.pct}%</b><span>do curso concluído</span></div>
          <div class="stat"><b>${g.feitas}</b><span>aulas assistidas</span></div>
          <div class="stat"><b>${g.total - g.feitas}</b><span>aulas restantes</span></div>
          <div class="stat"><b>${modulos.filter((m) => { const s = stats(aulasDe(m.id)); return s.total && s.pct === 100; }).length}/${modulos.length}</b><span>módulos completos</span></div>
        </div>
        ${bar(g.pct)}
        ${g.total && g.pct === 100 ? '<p class="badge badge--ok" style="margin-top:14px">🎉 Você concluiu todo o curso!</p>' : ""}
        ${modulos.map((m, i) => {
          const l = aulasDe(m.id), s = stats(l);
          return `<div class="panel"><div class="row-between"><h3>Módulo ${i + 1} — ${esc(m.titulo)}</h3><b>${s.pct}%</b></div>
            ${bar(s.pct)}
            <ul class="lesson-list lesson-list--compact">${l.map((a) => `<li><a href="#/aula/${a.id}" class="lesson-row ${done[a.id] ? "is-done" : ""}">
              <span class="check">${done[a.id] ? "✓" : ""}</span><span class="lesson-row__t">${esc(a.titulo)}</span>
              <small class="muted">${done[a.id] ? "Assistida" : "Pendente"}</small></a></li>`).join("")}</ul></div>`;
        }).join("")}
      </section>`;
  }

  function route() {
    window.scrollTo(0, 0);
    const [, page, id] = (location.hash || "#/").split("/");
    document.querySelectorAll("[data-nav]").forEach((a) =>
      a.classList.toggle("is-active", a.dataset.nav === (page === "progresso" ? "progresso" : "home")));
    if (page === "modulo") renderModulo(id);
    else if (page === "aula") renderAula(id);
    else if (page === "progresso") renderProgresso();
    else renderHome();
  }
  window.addEventListener("hashchange", route);
  route();
})();
