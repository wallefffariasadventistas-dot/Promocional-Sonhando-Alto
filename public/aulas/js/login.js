(function () {
  const $ = (s) => document.querySelector(s);
  const msg = $("#msg");
  const setMsg = (t, type) => { msg.textContent = t; msg.className = "msg" + (type ? " msg--" + type : ""); };

  const erro = new URLSearchParams(location.search).get("erro");
  if (erro === "bloqueado") setMsg("Seu acesso está bloqueado. Fale com o administrador.", "error");
  if (erro === "semperfil") setMsg("Não encontramos seu cadastro. Crie uma conta.", "error");

  if (window.AULAS_MODO_LOCAL) {
    $("#online-box").hidden = true;
    $("#local-box").hidden = false;
    const entrar = (tipo) => { PL.auth.signInLocal(tipo); location.href = tipo === "admin" ? "/aulas/admin.html" : "/aulas/aluno.html"; };
    $("#entrar-aluno").onclick = () => entrar("aluno");
    $("#entrar-admin").onclick = () => entrar("admin");
    $("#resetar").onclick = () => { if (confirm("Apagar tudo e voltar aos dados de demonstração?")) window.aulasResetLocal(); };
  }

  PL.loadConfig().then((c) => {
    $("#brand-sub").textContent = c.subtitulo;
    if (!c.cadastroAberto) {
      $("#tab-cadastro").hidden = true;
    }
  });

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("is-active", x === t));
      $("#form-entrar").hidden = t.dataset.tab !== "entrar";
      $("#form-cadastro").hidden = t.dataset.tab !== "cadastro";
      setMsg("");
    })
  );

  async function goAfterLogin(user) {
    const p = await PL.getProfile(user);
    if (!p) {
      await PL.auth.signOut();
      return setMsg("Não encontramos seu cadastro. Crie uma conta.", "error");
    }
    if (p.status === "blocked") {
      await PL.auth.signOut();
      return setMsg("Seu acesso está bloqueado. Fale com o administrador.", "error");
    }
    if (p.status !== "approved") return void (location.href = "/aulas/pendente.html");
    location.href = p.role === "admin" ? "/aulas/admin.html" : "/aulas/aluno.html";
  }

  // Já logado? segue direto.
  PL.auth.onAuthStateChanged((u) => { if (u && !PL.busy) goAfterLogin(u).catch(() => {}); });

  function busy(form, on) {
    const b = form.querySelector("button[type=submit]");
    b.disabled = on;
    PL.busy = on;
  }

  $("#form-entrar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    setMsg("");
    busy(f, true);
    try {
      const cred = await PL.auth.signInWithEmailAndPassword(f.email.value.trim(), f.senha.value);
      PL.busy = false;
      await goAfterLogin(cred.user);
    } catch (err) {
      setMsg(PL.authError(err), "error");
    }
    busy(f, false);
  });

  $("#form-cadastro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    setMsg("");
    if (!f.nome.value.trim()) return setMsg("Informe seu nome.", "error");
    busy(f, true);
    try {
      const cred = await PL.auth.createUserWithEmailAndPassword(f.email.value.trim(), f.senha.value);
      const boot = PL.ADMIN_EMAILS.map((x) => x.toLowerCase()).includes(cred.user.email.toLowerCase());
      await PL.db.collection("users").doc(cred.user.uid).set({
        nome: f.nome.value.trim(),
        email: cred.user.email,
        telefone: f.telefone.value.trim(),
        status: boot ? "approved" : "pending",
        role: boot ? "admin" : "student",
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      PL.busy = false;
      location.href = boot ? "/aulas/admin.html" : "/aulas/pendente.html";
      return;
    } catch (err) {
      setMsg(PL.authError(err), "error");
    }
    busy(f, false);
  });

  $("#esqueci").addEventListener("click", async () => {
    const email = $("#form-entrar").email.value.trim();
    if (!email) return setMsg("Digite seu e-mail acima e clique novamente.", "error");
    try {
      await PL.auth.sendPasswordResetEmail(email);
      setMsg("Enviamos um link para redefinir a senha no seu e-mail.", "ok");
    } catch (err) {
      setMsg(PL.authError(err), "error");
    }
  });
})();
