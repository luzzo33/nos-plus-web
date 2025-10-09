const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { verifyTurnstile } = require('../helpers/turnstile');
const {
  getUserByEmail,
  getUserById,
  createUser,
  updateLastLogin,
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  verifyPassword,
} = require('../services/auth/users');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

function normalizeUserResponse(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
  };
}

function signJwt(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      status: user.status,
    },
    secret,
    { expiresIn: '12h' },
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'EMAIL_REQUIRED' } });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'PASSWORD_TOO_WEAK', message: 'Password must be at least 8 characters' },
      });
    }

    const remoteIp = (req.ip || req.headers['x-forwarded-for'] || '').toString();
    const captchaResult = await verifyTurnstile(captchaToken, remoteIp);
    if (!captchaResult.success) {
      return res
        .status(400)
        .json({ success: false, error: { code: captchaResult.code || 'CAPTCHA_INVALID' } });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS' } });
    }

    const user = await createUser({ email, password });
    const verification = await createEmailVerificationToken(user.id);

    return res.status(201).json({
      success: true,
      user: normalizeUserResponse(user),
      verification: process.env.NODE_ENV === 'production' ? null : verification.token,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: { code: 'REGISTER_FAILED', message: err.message } });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'CREDENTIALS_REQUIRED' } });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS' } });
    }
    const valid = await verifyPassword(user, password);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS' } });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in.',
        },
      });
    }

    await updateLastLogin(user.id);
    const token = signJwt(user);
    return res.json({ success: true, token, user: normalizeUserResponse(user) });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: { code: 'LOGIN_FAILED', message: err.message } });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: { code: 'TOKEN_REQUIRED' } });
    }
    const userId = await consumeEmailVerificationToken(token, 'verify_email');
    if (!userId) {
      return res.status(400).json({ success: false, error: { code: 'TOKEN_INVALID' } });
    }
    const user = await getUserById(userId);
    return res.json({ success: true, user: normalizeUserResponse(user) });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: { code: 'VERIFY_FAILED', message: err.message } });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email, captchaToken } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: { code: 'EMAIL_REQUIRED' } });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    }
    if (user.status === 'active') {
      return res.status(200).json({ success: true, message: 'Already verified.' });
    }
    const remoteIp = (req.ip || req.headers['x-forwarded-for'] || '').toString();
    const captchaResult = await verifyTurnstile(captchaToken, remoteIp);
    if (!captchaResult.success) {
      return res
        .status(400)
        .json({ success: false, error: { code: captchaResult.code || 'CAPTCHA_INVALID' } });
    }

    const verification = await createEmailVerificationToken(user.id);
    return res.json({ success: true });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: { code: 'RESEND_FAILED', message: err.message } });
  }
});

module.exports = router;
