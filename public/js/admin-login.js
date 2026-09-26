(function () {
  const btn = document.getElementById("login-btn");
  const messageEl = document.getElementById("login-message");
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message" + (type ? ` form-message--${type}` : "");
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

  // Trata o retorno do Google depois do redirecionamento.
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
      btn.disabled = false;
      btn.textContent = "Entrar com Google";
    });

  btn.addEventListener("click", () => {
    setMessage("", "");
    btn.disabled = true;
    btn.textContent = "Redirecionando para o Google...";
    auth.signInWithRedirect(provider).catch((err) => {
      setMessage(err.message || "Não foi possível iniciar o login.", "error");
      btn.disabled = false;
      btn.textContent = "Entrar com Google";
    });
  });
})();
