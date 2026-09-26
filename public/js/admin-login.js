(function () {
  const btn = document.getElementById("login-btn");
  const messageEl = document.getElementById("login-message");
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  const POPUP_BLOCKED_CODES = [
    "auth/popup-blocked",
    "auth/operation-not-supported-in-this-environment",
    "auth/popup-closed-by-user",
  ];

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message" + (type ? ` form-message--${type}` : "");
  }

  function resetButton() {
    btn.disabled = false;
    btn.textContent = "Entrar com Google";
  }

  async function completeLogin(user) {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Não foi possível entrar.");
    }
    window.location.href = "/admin/dashboard.html";
  }

  // Se já estiver logado (sessão do nosso backend), vai direto para o painel.
  fetch("/api/admin/session")
    .then((r) => r.json())
    .then((data) => {
      if (data.isAdmin) window.location.href = "/admin/dashboard.html";
    })
    .catch(() => {});

  // Trata o retorno do Google quando o login foi feito via redirecionamento
  // (fallback usado quando o navegador bloqueia o pop-up).
  auth
    .getRedirectResult()
    .then((result) => {
      if (result && result.user) {
        btn.disabled = true;
        btn.textContent = "Entrando...";
        return completeLogin(result.user);
      }
    })
    .catch((err) => {
      setMessage(err.message || "Não foi possível entrar com o Google.", "error");
      resetButton();
    });

  btn.addEventListener("click", async () => {
    setMessage("", "");
    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const result = await auth.signInWithPopup(provider);
      await completeLogin(result.user);
    } catch (err) {
      if (POPUP_BLOCKED_CODES.includes(err.code)) {
        // Pop-up bloqueado pelo navegador: tenta de novo com redirecionamento.
        btn.textContent = "Redirecionando para o Google...";
        auth.signInWithRedirect(provider).catch((redirectErr) => {
          setMessage(redirectErr.message || "Não foi possível entrar com o Google.", "error");
          resetButton();
        });
        return;
      }
      setMessage(err.message || "Não foi possível entrar com o Google.", "error");
      await auth.signOut().catch(() => {});
      resetButton();
    }
  });
})();
