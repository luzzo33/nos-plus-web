const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    req.authUser = null;
    return next();
  }
  const token = header.slice(7).trim();
  if (!token) {
    req.authUser = null;
    return next();
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    req.authUser = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, secret);
    req.authUser = {
      id: payload.sub,
      email: payload.email,
      status: payload.status,
      token,
    };
  } catch (err) {
    req.authUser = null;
  }
  return next();
}

function requireUser(req, res, next) {
  if (req.authUser && req.authUser.status === 'active') {
    return next();
  }
  return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED' } });
}

module.exports = {
  authenticateUser,
  requireUser,
};
