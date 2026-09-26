const { checkConnection, usingLocalFallback } = require("../lib/db");

function hasEnvVar(name) {
  return typeof process.env[name] === "string" && process.env[name].length > 0;
}

module.exports = async function handler(req, res) {
  const result = {
    ok: false,
    env: {
      FIREBASE_SERVICE_ACCOUNT_BASE64: hasEnvVar("FIREBASE_SERVICE_ACCOUNT_BASE64"),
      FIREBASE_PROJECT_ID: hasEnvVar("FIREBASE_PROJECT_ID"),
      FIREBASE_CLIENT_EMAIL: hasEnvVar("FIREBASE_CLIENT_EMAIL"),
      FIREBASE_PRIVATE_KEY: hasEnvVar("FIREBASE_PRIVATE_KEY"),
      SESSION_SECRET: hasEnvVar("SESSION_SECRET"),
      ADMIN_USERNAME: hasEnvVar("ADMIN_USERNAME"),
      ADMIN_PASSWORD_HASH: hasEnvVar("ADMIN_PASSWORD_HASH"),
    },
    database: { mode: null, connected: false, error: null },
  };

  if (usingLocalFallback) {
    result.database.mode = "local-file (desenvolvimento — sem Firebase conectado)";
    result.database.connected = true;
    result.ok = true;
    result.database.error =
      "Atenção: nenhuma credencial do Firebase foi encontrada (nem " +
      "FIREBASE_SERVICE_ACCOUNT_BASE64, nem FIREBASE_PROJECT_ID + " +
      "FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY), então os leads estão sendo " +
      "salvos em um arquivo temporário, não em um banco de verdade. Se isto estiver " +
      "rodando em produção (Vercel), configure essas variáveis e faça um redeploy — " +
      "os dados salvos neste modo se perdem.";
    return res.status(200).json(result);
  }

  result.database.mode = "firestore";
  try {
    await checkConnection();
    result.database.connected = true;
    result.ok = true;
  } catch (err) {
    result.database.error = String(err && err.message ? err.message : err);
  }

  return res.status(200).json(result);
};
