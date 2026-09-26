(function () {
  const form = document.getElementById("login-form");
  const btn = document.getElementById("login-btn");
  const messageEl = document.getElementById("login-message");
  const auth = firebase.auth();

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message" + (type ? ` form-message--${type}` : "");
  }

  function friendlyAuthError(err) {
    switch (err.code) {
      case "auth/invalid-email":
        return "E-mail inválido.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "E-mail ou senha inválidos.";
      case "auth/too-many-requests":
        return "Muitas tentativas. Aguarde um pouco e tente de novo.";
      default:
        return "Não foi possível entrar. Tente novamente.";
    }
  }

  // Se já estiver logado (sessão do nosso backend), vai direto para o painel.
  fetch("/api/admin/session")
    .then((r) => r.json())
    .then((data) => {
      if (data.isAdmin) window.location.href = "/admin/dashboard.html";
    })
    .catch(() => {});

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("", "");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const credential = await auth.signInWithEmailAndPassword(email, password);
      const idToken = await credential.user.getIdToken();

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
    } catch (err) {
      setMessage(err.code ? friendlyAuthError(err) : err.message, "error");
      await auth.signOut().catch(() => {});
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
})();
