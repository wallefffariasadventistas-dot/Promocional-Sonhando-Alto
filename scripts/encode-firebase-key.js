// Converte o arquivo .json da conta de serviço do Firebase em uma única
// linha base64, pronta para colar em FIREBASE_SERVICE_ACCOUNT_BASE64.
// Uso: node scripts/encode-firebase-key.js caminho/para/service-account.json
const fs = require("fs");

const filePath = process.argv[2];

if (!filePath) {
  console.error("Uso: node scripts/encode-firebase-key.js <caminho-do-arquivo.json>");
  process.exit(1);
}

const json = fs.readFileSync(filePath, "utf8");
JSON.parse(json); // valida que é um JSON válido antes de codificar
const base64 = Buffer.from(json).toString("base64");

console.log("\nAdicione esta linha ao seu .env.local (ou cole o valor no Vercel):\n");
console.log(`FIREBASE_SERVICE_ACCOUNT_BASE64=${base64}\n`);
