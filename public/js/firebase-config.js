// Configuração pública do app Firebase (não é segredo — protegida pelas
// regras de segurança do projeto, não por ficar oculta).
//
// authDomain usa o PRÓPRIO domínio do site (não o firebaseapp.com padrão) +
// o rewrite em vercel.json que repassa /__/auth/* pra lá por baixo dos panos.
// Isso é o que corrige o erro "missing initial state" do login no Safari/iOS:
// o Safari bloqueia armazenamento de domínios "terceiros" que o usuário nunca
// visita diretamente (como o firebaseapp.com), e com isso o processo de login
// do Google passa a rodar inteiro dentro do domínio do site, sem esse bloqueio.
firebase.initializeApp({
  apiKey: "AIzaSyDmK3GN-CrSoiyYh6aPgmBbnWToQgTPczg",
  authDomain: window.location.hostname,
  projectId: "promocional-sonhando-alto",
  storageBucket: "promocional-sonhando-alto.firebasestorage.app",
  messagingSenderId: "252580833647",
  appId: "1:252580833647:web:b40dae4b9ed88a1a4fa09a",
});
