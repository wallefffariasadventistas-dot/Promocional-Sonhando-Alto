const fs = require("fs");
const os = require("os");
const path = require("path");

const LEADS_COLLECTION = "leads";

function getServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    } catch (err) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 inválido: " + err.message);
    }
  }

  // Alternativa: três variáveis separadas, copiadas diretamente do arquivo
  // .json da conta de serviço (sem precisar rodar nenhum comando).
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKeyRaw) {
    return {
      projectId,
      clientEmail,
      // O campo private_key do JSON tem quebras de linha escritas como "\n";
      // ao colar em uma variável de ambiente elas viram texto literal, então
      // convertemos de volta para quebras de linha reais aqui.
      privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

const serviceAccount = getServiceAccount();
const usingLocalFallback = !serviceAccount;

let firestore = null;
function getFirestore() {
  if (!firestore) {
    const { initializeApp, getApps, cert } = require("firebase-admin/app");
    const { getFirestore: getFirestoreInstance } = require("firebase-admin/firestore");
    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) });
    }
    firestore = getFirestoreInstance();
  }
  return firestore;
}

function ensureSchema() {
  // Firestore não exige criação de schema/tabela — não há nada a fazer aqui.
  return Promise.resolve();
}

/** Faz uma chamada real ao Firestore para confirmar que a conexão funciona. */
async function checkConnection() {
  if (usingLocalFallback) return true;
  const db = getFirestore();
  await db.collection(LEADS_COLLECTION).limit(1).get();
  return true;
}

// --- Fallback local em arquivo (apenas quando nenhum Firebase está configurado) ---
// Permite testar o formulário e o painel admin localmente antes de configurar
// FIREBASE_SERVICE_ACCOUNT_BASE64. Em produção, assim que essa variável existir,
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

  const { FieldValue } = require("firebase-admin/firestore");
  const db = getFirestore();
  await db.collection(LEADS_COLLECTION).add({
    nome,
    telefone,
    idade,
    curso,
    cidade,
    distrito,
    created_at: FieldValue.serverTimestamp(),
  });
}

function toIso(value) {
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  return value || null;
}

async function listLeads() {
  if (usingLocalFallback) {
    return readLocalLeads().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const db = getFirestore();
  const snapshot = await db.collection(LEADS_COLLECTION).orderBy("created_at", "desc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, ...data, created_at: toIso(data.created_at) };
  });
}

module.exports = { ensureSchema, checkConnection, insertLead, listLeads, usingLocalFallback };
