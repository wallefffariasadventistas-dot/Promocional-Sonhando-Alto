const { neon } = require("@neondatabase/serverless");

function getConnectionString() {
  const url =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      "Nenhuma variável de conexão com o Postgres encontrada (DATABASE_URL / POSTGRES_URL)."
    );
  }
  return url;
}

let sqlClient = null;
function sql(strings, ...values) {
  if (!sqlClient) sqlClient = neon(getConnectionString());
  return sqlClient(strings, ...values);
}

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        telefone TEXT NOT NULL,
        idade INTEGER NOT NULL,
        curso TEXT NOT NULL,
        cidade TEXT NOT NULL,
        distrito TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  }
  return schemaReady;
}

async function insertLead({ nome, telefone, idade, curso, cidade, distrito }) {
  await ensureSchema();
  await sql`
    INSERT INTO leads (nome, telefone, idade, curso, cidade, distrito)
    VALUES (${nome}, ${telefone}, ${idade}, ${curso}, ${cidade}, ${distrito})
  `;
}

async function listLeads() {
  await ensureSchema();
  return sql`SELECT * FROM leads ORDER BY created_at DESC`;
}

module.exports = { ensureSchema, insertLead, listLeads };
