// Núcleo compartilhado da plataforma de aulas: Firebase, sessão, utilitários.
// IMPORTANTE: a lista ADMIN_EMAILS deve ser a mesma usada nas regras do
// Firestore (veja aulas/README.md). Ela serve para o "primeiro administrador".
(function () {
  const ADMIN_EMAILS = ["walleff.fariasadventistas@gmail.com"];

  const auth = firebase.auth();
  const db = firebase.firestore();
  const DEFAULTS = {
    nome: "Formação de Colportores",
    subtitulo: "Aprenda, avance e realize seu chamado.",
    cor: "#f5811f",
    logoUrl: "",
    bannerUrl: "",
    cadastroAberto: true,
    mensagemPendente:
      "Seu cadastro foi recebido e está aguardando aprovação do administrador. Assim que for liberado, você poderá assistir às aulas.",
    rodape: "Sonhando Alto",
  };

  const PL = { auth, db, ADMIN_EMAILS, DEFAULTS, config: { ...DEFAULTS } };

  const isAdminEmail = (email) =>
    !!email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());

  PL.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  PL.initials = (nome) =>
    (nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  PL.fmtDate = (ts) => {
    const d = ts && ts.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    return d ? d.toLocaleDateString("pt-BR") : "—";
  };

  PL.toast = (msg, type) => {
    let box = document.getElementById("toasts");
    if (!box) {
      box = document.createElement("div");
      box.id = "toasts";
      document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "toast" + (type ? " toast--" + type : "");
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  };

  PL.authError = (err) => {
    const map = {
      "auth/invalid-email": "E-mail inválido.",
      "auth/user-not-found": "E-mail ou senha incorretos.",
      "auth/wrong-password": "E-mail ou senha incorretos.",
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
      "auth/email-already-in-use": "Este e-mail já está cadastrado. Tente entrar.",
      "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
      "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
      "auth/network-request-failed": "Sem conexão com a internet.",
      "permission-denied": "Sem permissão para essa ação.",
    };
    return map[err && err.code] || (err && err.message) || "Ocorreu um erro. Tente novamente.";
  };

  // ---- Configurações visuais (config/plataforma) ----
  PL.applyTheme = () => {
    const c = PL.config;
    document.documentElement.style.setProperty("--accent", c.cor || DEFAULTS.cor);
    document.querySelectorAll("[data-brand-name]").forEach((el) => (el.textContent = c.nome));
    document.querySelectorAll("[data-brand-logo]").forEach((el) => {
      if (c.logoUrl) {
        el.innerHTML = `<img src="${PL.esc(c.logoUrl)}" alt="${PL.esc(c.nome)}" />`;
      }
    });
    if (document.title.indexOf("—") === -1) document.title = c.nome;
  };

  PL.loadConfig = async () => {
    try {
      const snap = await db.collection("config").doc("plataforma").get();
      if (snap.exists) PL.config = { ...DEFAULTS, ...snap.data() };
    } catch (e) {
      // usa os padrões se não conseguir ler
    }
    PL.applyTheme();
    return PL.config;
  };

  // ---- Perfil do usuário (users/{uid}) ----
  PL.getProfile = async (user) => {
    const ref = db.collection("users").doc(user.uid);
    let snap = await ref.get();
    if (!snap.exists && isAdminEmail(user.email)) {
      // primeiro acesso do administrador principal: cria e aprova o perfil
      await ref.set({
        nome: user.displayName || "Administrador",
        email: user.email,
        telefone: "",
        status: "approved",
        role: "admin",
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      snap = await ref.get();
    }
    return snap.exists ? { uid: user.uid, ...snap.data() } : null;
  };

  // Garante sessão + perfil. opts: { admin: true } exige administrador,
  // { student: true } exige aluno aprovado (admins também entram).
  PL.requireSession = (opts) =>
    new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged(async (user) => {
        unsub();
        if (!user) return void (location.href = "/aulas/");
        try {
          const profile = await PL.getProfile(user);
          if (!profile) {
            await auth.signOut();
            return void (location.href = "/aulas/?erro=semperfil");
          }
          if (profile.status === "blocked") {
            await auth.signOut();
            return void (location.href = "/aulas/?erro=bloqueado");
          }
          if (profile.status !== "approved") return void (location.href = "/aulas/pendente.html");
          if (opts && opts.admin && profile.role !== "admin") {
            return void (location.href = "/aulas/aluno.html");
          }
          resolve({ user, profile });
        } catch (e) {
          document.body.innerHTML =
            '<p style="padding:40px;color:#fff;font-family:sans-serif">Não foi possível carregar seus dados: ' +
            PL.esc(PL.authError(e)) + "</p>";
        }
      });
    });

  PL.logout = async () => {
    await auth.signOut();
    location.href = "/aulas/";
  };

  // ---- Vídeos ----
  // Devolve { type: "youtube"|"vimeo"|"drive"|"file"|"iframe", id?, src }
  PL.parseVideo = (url) => {
    url = (url || "").trim();
    if (!url) return null;
    let m =
      url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return { type: "youtube", id: m[1] };
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\w]+))?/i);
    if (m) {
      const h = m[2] ? "?h=" + m[2] : "";
      return { type: "vimeo", src: "https://player.vimeo.com/video/" + m[1] + h };
    }
    m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i);
    if (m) return { type: "drive", src: "https://drive.google.com/file/d/" + m[1] + "/preview" };
    if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url)) return { type: "file", src: url };
    if (/^https:\/\//i.test(url)) return { type: "iframe", src: url };
    return null;
  };

  let ytApi;
  const loadYT = () =>
    ytApi ||
    (ytApi = new Promise((res) => {
      if (window.YT && window.YT.Player) return res();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }));

  // Monta o player dentro de `el`. `onEnded` é chamado quando o vídeo termina
  // (só é possível detectar em YouTube e arquivos de vídeo diretos).
  PL.mountPlayer = (el, url, onEnded) => {
    el.innerHTML = "";
    const v = PL.parseVideo(url);
    if (!v) {
      el.innerHTML = '<div class="player__empty">Vídeo indisponível.</div>';
      return { autoTracked: false };
    }
    if (v.type === "youtube") {
      const holder = document.createElement("div");
      el.appendChild(holder);
      loadYT().then(() => {
        new YT.Player(holder, {
          videoId: v.id,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: { onStateChange: (e) => { if (e.data === 0 && onEnded) onEnded(); } },
        });
      });
      return { autoTracked: true };
    }
    if (v.type === "file") {
      const vid = document.createElement("video");
      vid.controls = true;
      vid.playsInline = true;
      vid.src = v.src;
      vid.addEventListener("ended", () => onEnded && onEnded());
      el.appendChild(vid);
      return { autoTracked: true };
    }
    const f = document.createElement("iframe");
    f.src = v.src;
    f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    el.appendChild(f);
    return { autoTracked: false };
  };

  PL.videoThumb = (url) => {
    const v = PL.parseVideo(url);
    return v && v.type === "youtube" ? "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg" : "";
  };

  // Ordena por `ordem` (com desempate por título)
  PL.byOrder = (a, b) =>
    (a.ordem || 0) - (b.ordem || 0) || String(a.titulo).localeCompare(String(b.titulo), "pt-BR");

  PL.snapList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  window.PL = PL;
})();
