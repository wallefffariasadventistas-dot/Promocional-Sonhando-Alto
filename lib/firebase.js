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

let app = null;
function getFirebaseApp() {
  if (usingLocalFallback) {
    throw new Error("Firebase não configurado (nenhuma credencial encontrada).");
  }
  if (!app) {
    const { initializeApp, getApps, cert } = require("firebase-admin/app");
    const apps = getApps();
    app = apps.length ? apps[0] : initializeApp({ credential: cert(serviceAccount) });
  }
  return app;
}

module.exports = { getFirebaseApp, usingLocalFallback };
