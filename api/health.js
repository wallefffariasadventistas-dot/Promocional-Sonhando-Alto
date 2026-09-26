const { ensureSchema, usingLocalFallback } = require("../lib/db");

function hasEnvVar(name) {
  return typeof process.env[name] === "string" && process.env[name].length > 0;
}

module.exports = async function handler(req, res) {
  const result = {
    ok: false,
    env: {
      DATABASE_URL: hasEnvVar("DATABASE_URL"),
      POSTGRES_URL: hasEnvVar("POSTGRES_URL"),
      POSTGRES_URL_NON_POOLING: hasEnvVar("POSTGRES_URL_NON_POOLING"),
      SESSION_SECRET: hasEnvVar("SESSION_SECRET"),
      ADMIN_USERNAME: hasEnvVar("ADMIN_USERNAME"),
      ADMIN_PASSWORD_HASH: hasEnvVar("ADMIN_PASSWORD_HASH"),
    },
    database: { mode: null, connected: false, error: null },
  };

  if (usingLocalFallback) {
    result.database.mode = "local-file (desenvolvimento — sem Postgres conectado)";
    result.database.connected = true;
    result.ok = true;
    result.database.error =
      "Atenção: nenhuma variável de conexão com o Postgres foi encontrada, então os " +
      "leads estão sendo salvos em um arquivo temporário, não em um banco de verdade. " +
      "Se isto estiver rodando em produção (Vercel), conecte um Postgres em " +
      "Storage → Create Database e faça um redeploy — os dados salvos neste modo se perdem.";
    return res.status(200).json(result);
  }

  result.database.mode = "postgres";
  try {
    await ensureSchema();
    result.database.connected = true;
    result.ok = true;
  } catch (err) {
    result.database.error = String(err && err.message ? err.message : err);
  }

  return res.status(200).json(result);
};
