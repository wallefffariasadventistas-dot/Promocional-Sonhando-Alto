(function () {
  const COURSES = [
    "Teologia",
    "Pedagogia",
    "Enfermagem",
    "Administração",
    "Educação Física",
    "Música",
    "Comunicação Social",
    "Design Gráfico",
    "Psicologia",
    "Nutrição",
    "Sistemas de Informação",
    "Outro",
  ];

  const cursoSelect = document.getElementById("curso");
  COURSES.forEach((course) => {
    const opt = document.createElement("option");
    opt.value = course;
    opt.textContent = course;
    cursoSelect.appendChild(opt);
  });

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const form = document.getElementById("lead-form");
  const submitBtn = document.getElementById("submit-btn");
  const messageEl = document.getElementById("form-message");

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message" + (type ? ` form-message--${type}` : "");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("", "");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível enviar seus dados. Tente novamente.");
      }

      form.reset();
      setMessage(
        "Recebemos seus dados! Em breve nossa equipe entrará em contato. 🎉",
        "success"
      );
    } catch (err) {
      setMessage(err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar meus dados";
    }
  });
})();
