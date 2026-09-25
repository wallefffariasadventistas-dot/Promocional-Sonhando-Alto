// Gera o hash bcrypt de uma senha para usar em ADMIN_PASSWORD_HASH no .env
// Uso: node scripts/hash-password.js "minhaSenhaForte"
const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error("Uso: node scripts/hash-password.js <senha>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log("\nAdicione esta linha ao seu arquivo .env:\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
