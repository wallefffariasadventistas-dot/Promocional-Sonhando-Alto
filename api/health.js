const { ensureSchema } = require("../lib/db");

function hasEnvVar(name) {
  return typeof process.env[name] === "string" && process.env[name].length > 0;
}

module.exports = async function handler(req, res) {
  const dbEnvVars = {
    DATABASE_URL: hasEnvVar("DATABASE_URL"),
    POSTGRES_URL: hasEnvVar("POSTGRES_URL"),
    POSTGRES_URL_NON_POOLING: hasEnvVar("POSTGRES_URL_NON_POOLING"),
  };
  const hasAnyDbUrl = Object.values(dbEnvVars).some(Boolean);

  const result = {
    ok: false,
    env: {
      ...dbEnvVars,
      SESSION_SECRET: hasEnvVar("SESSION_SECRET"),
      ADMIN_USERNAME: hasEnvVar("ADMIN_USERNAME"),
      ADMIN_PASSWORD_HASH: hasEnvVar("ADMIN_PASSWORD_HASH"),
    },
    database: { connected: false, error: null },
  };

  if (!hasAnyDbUrl) {
    result.database.error =
      "Nenhuma variável de conexão com o banco encontrada (DATABASE_URL / POSTGRES_URL / POSTGRES_URL_NON_POOLING). " +
      "Vá em Vercel → Storage → Create Database → Postgres e conecte ao projeto, depois faça um redeploy.";
    return res.status(200).json(result);
  }

  try {
    await ensureSchema();
    result.database.connected = true;
    result.ok = true;
  } catch (err) {
    result.database.error = String(err && err.message ? err.message : err);
  }

  return res.status(200).json(result);
};
