const { getFirebaseApp, usingLocalFallback } = require("./firebase");

/**
 * Verifica o ID token emitido pelo Firebase Authentication no navegador
 * (após signInWithEmailAndPassword) e retorna os dados do usuário
 * (inclui .email) se for válido. Lança erro se inválido/expirado.
 */
async function verifyIdToken(idToken) {
  if (usingLocalFallback) {
    throw new Error(
      "Login com Firebase indisponível: nenhuma credencial do Firebase configurada no servidor."
    );
  }
  const { getAuth } = require("firebase-admin/auth");
  const auth = getAuth(getFirebaseApp());
  return auth.verifyIdToken(idToken);
}

module.exports = { verifyIdToken };
