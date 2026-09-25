require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");

const leadsRouter = require("./routes/leads");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  console.warn(
    "[aviso] SESSION_SECRET não definido no .env — usando um valor temporário apenas para desenvolvimento."
  );
}

app.set("trust proxy", 1);
app.use(express.json());
app.use(
  session({
    name: "sonhandoalto.sid",
    secret: process.env.SESSION_SECRET || "dev-only-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 4, // 4 horas
    },
  })
);

app.use("/api/leads", leadsRouter);
app.use("/api/admin", adminRouter);

// Área /admin exige login (a tela de login em si fica pública). Precisa vir
// antes do express.static para que o arquivo não seja servido diretamente.
app.get("/admin/dashboard.html", (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/admin/");
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
