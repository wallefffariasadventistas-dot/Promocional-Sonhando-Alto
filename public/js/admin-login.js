(function () {
  const form = document.getElementById("login-form");
  const btn = document.getElementById("login-btn");
  const messageEl = document.getElementById("login-message");

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message" + (type ? ` form-message--${type}` : "");
  }

  // Se já estiver logado, vai direto para o painel.
  fetch("/api/admin/session")
    .then((r) => r.json())
    .then((data) => {
      if (data.isAdmin) window.location.href = "/admin/dashboard.html";
    })
    .catch(() => {});

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("", "");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível entrar.");
      }

      window.location.href = "/admin/dashboard.html";
    } catch (err) {
      setMessage(err.message, "error");
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
})();
