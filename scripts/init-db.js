// Testa a conexão com o Firestore usando FIREBASE_SERVICE_ACCOUNT_BASE64.
// Uso local: vercel env pull .env.local && npm run init-db
require("dotenv").config({ path: ".env.local" });
const { checkConnection, usingLocalFallback } = require("../lib/db");

if (usingLocalFallback) {
  console.log(
    "FIREBASE_SERVICE_ACCOUNT_BASE64 não configurado — nada para testar (modo local em arquivo)."
  );
  process.exit(0);
}

checkConnection()
  .then(() => {
    console.log("Conexão com o Firestore OK.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro ao conectar ao Firestore:", err);
    process.exit(1);
  });
