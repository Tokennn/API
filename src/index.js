const express = require('express');
const bcrypt = require('bcryptjs');
const { init, db } = require('./db');
const { requireAuth } = require('./authMiddleware');
const {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  ACCESS_TOKEN_TTL,
} = require('./tokenService');
const { listProducts } = require('./productsService');

init();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = signAccessToken(user);
  const { token: refreshToken, expiresAt } = issueRefreshToken(user.id);

  return res.json({
    accessToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL,
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  const result = rotateRefreshToken(refreshToken);
  if (!result.valid) {
    return res.status(401).json({ error: `Refresh token ${result.reason}` });
  }

  const user = {
    id: result.record.user_id,
    email: result.record.email,
    role: result.record.role,
  };

  const accessToken = signAccessToken(user);

  return res.json({
    accessToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL,
    refreshToken: result.newToken,
    refreshTokenExpiresAt: result.newExpiresAt,
    user,
  });
});

app.post('/auth/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  revokeRefreshToken(refreshToken);
  return res.json({ success: true });
});

app.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, email, role, created_at as createdAt FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json(user);
});

app.get('/products', requireAuth, (req, res) => {
  const includeCategory =
    (req.query.include || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .includes('category') || false;

  try {
    const result = listProducts({
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      fields: req.query.fields,
      includeCategory,
      filters: {
        category: req.query.category,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
      },
    });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.use((err, _req, res, _next) => {
  // Fallback error handler
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});
