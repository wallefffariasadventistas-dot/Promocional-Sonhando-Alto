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
  const db = firebase.firestore();

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "form-message" + (type ? ` form-message--${type}` : "");
  }

  function isBlank(value) {
    return typeof value !== "string" || value.trim().length === 0;
  }

  function validate(payload) {
    const nome = isBlank(payload.nome) ? "" : payload.nome.trim();
    const telefone = isBlank(payload.telefone) ? "" : payload.telefone.trim();
    const curso = isBlank(payload.curso) ? "" : payload.curso.trim();
    const cidade = isBlank(payload.cidade) ? "" : payload.cidade.trim();
    const distrito = isBlank(payload.distrito) ? "" : payload.distrito.trim();
    const idade = Number.parseInt(payload.idade, 10);

    const errors = [];
    if (!nome || nome.length > 150) errors.push("Nome inválido.");
    if (!telefone || telefone.replace(/\D/g, "").length < 8 || telefone.length > 30) {
      errors.push("Telefone inválido.");
    }
    if (!Number.isInteger(idade) || idade < 10 || idade > 100) errors.push("Idade inválida.");
    if (!curso || !COURSES.includes(curso)) errors.push("Curso de interesse inválido.");
    if (!cidade || cidade.length > 100) errors.push("Cidade inválida.");
    if (!distrito || distrito.length > 100) errors.push("Distrito inválido.");

    return { errors, data: { nome, telefone, idade, curso, cidade, distrito } };
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("", "");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // Honeypot: usuários reais nunca preenchem este campo oculto.
    if (!isBlank(payload.website)) {
      form.reset();
      setMessage("Recebemos seus dados! Em breve nossa equipe entrará em contato. 🎉", "success");
      return;
    }

    const { errors, data } = validate(payload);
    if (errors.length > 0) {
      setMessage(errors.join(" "), "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      await db.collection("leads").add({
        ...data,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
      });

      form.reset();
      setMessage(
        "Recebemos seus dados! Em breve nossa equipe entrará em contato. 🎉",
        "success"
      );
    } catch (err) {
      setMessage("Não foi possível enviar seus dados. Tente novamente.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar meus dados";
    }
  });
})();
