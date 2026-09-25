// Cria a tabela "leads" no Postgres, caso ainda não exista.
// Uso local: vercel env pull .env.local && npm run init-db
require("dotenv").config({ path: ".env.local" });
const { ensureSchema } = require("../lib/db");

ensureSchema()
  .then(() => {
    console.log('Tabela "leads" pronta.');
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro ao preparar o banco:", err);
    process.exit(1);
  });
