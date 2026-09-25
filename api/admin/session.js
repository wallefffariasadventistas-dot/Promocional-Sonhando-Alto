const { getAdminSession } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  const session = getAdminSession(req);
  return res.json({ isAdmin: Boolean(session) });
};
