(function () {
  const btn = document.getElementById("login-btn");
  const messageEl = document.getElementById("login-message");
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  const POPUP_BLOCKED_CODES = [
    "auth/popup-blocked",
    "auth/operation-not-supported-in-this-environment",
  ];

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

  // Trata o retorno do Google quando o pop-up foi bloqueado e caímos para
  // o modo de redirecionamento (abaixo). Erros aqui aparecem na mensagem;
  // sucesso é tratado pelo onAuthStateChanged acima.
  auth.getRedirectResult().catch((err) => {
    setMessage(err.message || "Não foi possível entrar com o Google.", "error");
    resetButton();
  });

  btn.addEventListener("click", async () => {
    setMessage("", "");
    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      await auth.signInWithPopup(provider);
      // onAuthStateChanged cuida do redirecionamento para o painel.
    } catch (err) {
      if (POPUP_BLOCKED_CODES.includes(err.code)) {
        btn.textContent = "Redirecionando para o Google...";
        auth.signInWithRedirect(provider).catch((redirectErr) => {
          setMessage(redirectErr.message || "Não foi possível entrar com o Google.", "error");
          resetButton();
        });
        return;
      }
      if (err.code === "auth/popup-closed-by-user") {
        resetButton();
        return;
      }
      setMessage(err.message || "Não foi possível entrar com o Google.", "error");
      resetButton();
    }
  });
})();
