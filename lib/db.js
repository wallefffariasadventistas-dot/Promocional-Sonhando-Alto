const fs = require("fs");
const os = require("os");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null
  );
}

const connectionString = getConnectionString();
const usingLocalFallback = !connectionString;

// --- Backend Postgres (produção, quando a variável de conexão existe) ---

let sqlClient = null;
function sql(strings, ...values) {
  if (!sqlClient) sqlClient = neon(connectionString);
  return sqlClient(strings, ...values);
}

let schemaReady = null;

function ensureSchema() {
  if (usingLocalFallback) return Promise.resolve();
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

// --- Fallback local em arquivo (apenas quando nenhum banco está conectado) ---
// Permite testar o formulário e o painel admin localmente antes de configurar
// o Postgres no Vercel. Em produção, assim que a variável de conexão existir,
// este fallback deixa de ser usado automaticamente.

const LOCAL_FILE = path.join(os.tmpdir(), "sonhando-alto-leads.local.json");

function readLocalLeads() {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeLocalLeads(leads) {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(leads, null, 2));
}

async function insertLead({ nome, telefone, idade, curso, cidade, distrito }) {
  if (usingLocalFallback) {
    const leads = readLocalLeads();
    const nextId = leads.reduce((max, l) => Math.max(max, l.id), 0) + 1;
    leads.push({
      id: nextId,
      nome,
      telefone,
      idade,
      curso,
      cidade,
      distrito,
      created_at: new Date().toISOString(),
    });
    writeLocalLeads(leads);
    return;
  }

  await ensureSchema();
  await sql`
    INSERT INTO leads (nome, telefone, idade, curso, cidade, distrito)
    VALUES (${nome}, ${telefone}, ${idade}, ${curso}, ${cidade}, ${distrito})
  `;
}

async function listLeads() {
  if (usingLocalFallback) {
    return readLocalLeads().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  await ensureSchema();
  return sql`SELECT * FROM leads ORDER BY created_at DESC`;
}

module.exports = { ensureSchema, insertLead, listLeads, usingLocalFallback };
