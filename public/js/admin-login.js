(function () {
  const btn = document.getElementById("login-btn");
  const messageEl = document.getElementById("login-message");
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message" + (type ? ` form-message--${type}` : "");
  }

  function resetButton() {
    btn.disabled = false;
    btn.textContent = "Entrar com Google";
  }

  // Se já estiver logado, vai direto para o painel. O próprio Firebase mantém
  // a sessão salva no navegador — não depende de nenhum servidor nosso.
  auth.onAuthStateChanged((user) => {
    if (user) window.location.href = "/admin/dashboard.html";
  });

  // Trata o retorno do Google depois do redirecionamento.
  auth.getRedirectResult().catch((err) => {
    setMessage(err.message || "Não foi possível entrar com o Google.", "error");
    resetButton();
  });

  btn.addEventListener("click", () => {
    setMessage("", "");
    btn.disabled = true;
    btn.textContent = "Redirecionando para o Google...";

    auth.signInWithRedirect(provider).catch((err) => {
      setMessage(err.message || "Não foi possível iniciar o login.", "error");
      resetButton();
    });
  });
})();
