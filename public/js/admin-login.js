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
    if (user) {
      try {
        localStorage.removeItem("ga_auto_retry_done");
      } catch (e) {
        // ignora se o storage estiver bloqueado
      }
      window.location.href = "/admin/dashboard.html";
    }
  });

  // Trata o retorno do Google depois do redirecionamento.
  auth.getRedirectResult().catch((err) => {
    const isMissingInitialState =
      err.code === "auth/missing-initial-state" ||
      err.code === "auth/web-storage-unsupported" ||
      (err.message && err.message.indexOf("missing initial state") !== -1);

    // Esse erro é um bug conhecido do Safari/iOS com sessionStorage durante o
    // redirecionamento do Google (o próprio sessionStorage é a parte que falha
    // aqui, por isso usamos localStorage para controlar a nova tentativa). Na
    // prática, tentar de novo uma vez resolve sozinho na maioria dos casos,
    // então refazemos automaticamente antes de incomodar o usuário com um erro.
    let alreadyRetried = false;
    try {
      alreadyRetried = localStorage.getItem("ga_auto_retry_done") === "1";
    } catch (e) {
      alreadyRetried = false;
    }

    if (isMissingInitialState && !alreadyRetried) {
      try {
        localStorage.setItem("ga_auto_retry_done", "1");
      } catch (e) {
        // ignora se o storage estiver bloqueado
      }
      setMessage("Ajustando o acesso, aguarde...", "");
      auth.signInWithRedirect(provider).catch(() => {
        setMessage(
          "Não foi possível entrar. Toque em \"Entrar com Google\" novamente.",
          "error"
        );
        resetButton();
      });
      return;
    }

    if (isMissingInitialState) {
      try {
        localStorage.removeItem("ga_auto_retry_done");
      } catch (e) {
        // ignora se o storage estiver bloqueado
      }
      setMessage(
        "O Safari bloqueou o login na primeira tentativa. Toque em \"Entrar com Google\" novamente — na segunda vez costuma funcionar.",
        "error"
      );
    } else {
      setMessage(err.message || "Não foi possível entrar com o Google.", "error");
    }
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
