// Carrega o "backend" da plataforma conforme o modo definido em modo.js.
// No modo ONLINE, carrega o Firebase de verdade. No modo LOCAL, define um
// substituto mínimo (mesma API) que guarda tudo no localStorage.
(function () {
  if (!window.AULAS_MODO_LOCAL) {
    ["app", "auth", "firestore"].forEach((n) =>
      document.write('<script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-' + n + '-compat.js"><\/script>'));
    document.write('<script src="/js/firebase-config.js"><\/script>');
    return;
  }

  const DB_KEY = "aulas_local_db", AUTH_KEY = "aulas_local_auth";
  const TS = { __serverTs: true };
  const load = () => { try { return JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch (e) { return null; } };
  const save = (d) => localStorage.setItem(DB_KEY, JSON.stringify(d));
  const enc = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x === TS ? { __t: Date.now() } : x)));
  const wrap = (d) => {
    const r = {};
    for (const k in d) { const v = d[k]; r[k] = v && v.__t ? { toDate: () => new Date(v.__t) } : v; }
    return r;
  };
  const rid = () => "id" + Math.random().toString(36).slice(2, 10);

  // ---- Dados de demonstração (primeira vez) ----
  function seed() {
    const now = Date.now(), db = {};
    const put = (p, v) => (db[p] = v);
    put("config/plataforma", { nome: "Formação de Colportores", subtitulo: "Aprenda, avance e realize seu chamado.", cor: "#f5811f", logoUrl: "", bannerUrl: "", cadastroAberto: true, mensagemPendente: "Seu cadastro foi recebido e está aguardando aprovação do administrador.", rodape: "Sonhando Alto" });
    put("users/local-admin", { nome: "Administrador", email: "admin@local", telefone: "", status: "approved", role: "admin", created_at: { __t: now } });
    put("users/local-aluno", { nome: "Aluno de Teste", email: "aluno@local", telefone: "", status: "approved", role: "student", created_at: { __t: now } });
    put("users/demo-pendente", { nome: "Maria (cadastro pendente)", email: "maria@exemplo.com", telefone: "(11) 99999-0000", status: "pending", role: "student", created_at: { __t: now } });
    const mods = [
      ["m1", "Introdução à Colportagem", "História, chamado e princípios do colportor."],
      ["m2", "Técnicas de Abordagem", "Como iniciar uma conversa e apresentar os livros."],
      ["m3", "Vendas e Finanças", "Metas, organização e prestação de contas."],
    ];
    mods.forEach(([id, t, d], i) => put("modulos/" + id, { titulo: t, descricao: d, capaUrl: "", publicado: true, ordem: i + 1, created_at: { __t: now } }));
    const yt = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";
    [["m1", "Boas-vindas ao curso"], ["m1", "O chamado do colportor"], ["m1", "Nossa história"],
     ["m2", "Primeiro contato"], ["m2", "Apresentando o livro"], ["m3", "Organizando suas metas"], ["m3", "Prestação de contas"]]
      .forEach(([m, t], i, arr) => {
        const ordem = arr.filter((x, j) => j <= i && x[0] === m).length;
        put("aulas/a" + (i + 1), { moduloId: m, titulo: t, descricao: "Descrição da aula \"" + t + "\". (Conteúdo de demonstração.)", videoUrl: yt, duracaoMin: 10, materiais: [{ nome: "Apostila (exemplo)", url: "https://example.com/apostila.pdf" }], publicado: true, ordem, created_at: { __t: now } });
      });
    save(db);
    return db;
  }
  if (!load()) seed();

  // ---- Firestore local ----
  function docRef(path) {
    return {
      id: path.split("/").pop(), path,
      collection: (n) => colRef(path + "/" + n),
      async get() { const d = load()[path]; return { id: this.id, exists: !!d, data: () => d && wrap(d) }; },
      async set(v) { const db = load(); db[path] = enc(v); save(db); },
      async update(v) { const db = load(); db[path] = Object.assign(db[path] || {}, enc(v)); save(db); },
      async delete() { const db = load(); delete db[path]; save(db); },
      onSnapshot(cb) { const g = async () => cb(await this.get()); g(); const i = setInterval(g, 1000); return () => clearInterval(i); },
    };
  }
  function colRef(path, filters) {
    filters = filters || [];
    return {
      doc: (id) => docRef(path + "/" + (id || rid())),
      where: (f, op, v) => colRef(path, filters.concat([[f, v]])),
      async add(v) { const r = docRef(path + "/" + rid()); await r.set(v); return r; },
      async get() {
        const db = load(), pre = path + "/";
        const docs = Object.keys(db)
          .filter((k) => k.startsWith(pre) && !k.slice(pre.length).includes("/"))
          .filter((k) => filters.every(([f, v]) => db[k][f] === v))
          .map((k) => ({ id: k.slice(pre.length), data: () => wrap(db[k]) }));
        return { docs };
      },
    };
  }
  const fs = {
    collection: (n) => colRef(n),
    doc: (p) => docRef(p),
    batch() {
      const ops = [];
      return { update: (r, v) => ops.push(() => r.update(v)), delete: (r) => ops.push(() => r.delete()), set: (r, v) => ops.push(() => r.set(v)),
        async commit() { for (const o of ops) await o(); } };
    },
  };

  // ---- Autenticação local: sem senha ----
  const getU = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { return null; } };
  const auth = {
    get currentUser() { return getU(); },
    onAuthStateChanged(cb) { setTimeout(() => cb(getU()), 0); return () => {}; },
    async signOut() { localStorage.removeItem(AUTH_KEY); },
    async sendPasswordResetEmail() {},
    // Entrada de teste: "admin" ou "aluno"
    signInLocal(tipo) {
      const u = tipo === "admin" ? { uid: "local-admin", email: "admin@local" } : { uid: "local-aluno", email: "aluno@local" };
      localStorage.setItem(AUTH_KEY, JSON.stringify(u));
      return u;
    },
    async createUserWithEmailAndPassword(e) { const u = { uid: rid(), email: e }; localStorage.setItem(AUTH_KEY, JSON.stringify(u)); return { user: u }; },
  };
  const secAuth = Object.assign({}, auth, {
    async createUserWithEmailAndPassword(e) { return { user: { uid: rid(), email: e } }; },
    async signOut() {},
  });

  const apps = [];
  const initializeApp = (o, n) => { const a = { name: n || "[DEFAULT]", options: o || {}, auth: () => (n ? secAuth : auth) }; apps.push(a); return a; };
  window.firebase = {
    initializeApp, app: () => apps[0], auth: () => auth,
    get apps() { return apps; },
    firestore: Object.assign(() => fs, { FieldValue: { serverTimestamp: () => TS } }),
  };
  initializeApp({});

  // Apaga tudo e volta aos dados de demonstração
  window.aulasResetLocal = () => { localStorage.removeItem(AUTH_KEY); seed(); location.href = "/aulas/"; };
})();
