const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db, nowIso } = require('./db');

const ACCESS_TOKEN_TTL = 5 * 60; // seconds
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const JWT_SECRET = process.env.JWT_SECRET || 'ma magnifique clef';

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL).toISOString();

  db.prepare(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `
  ).run(userId, tokenHash, expiresAt, nowIso());

  return { token, expiresAt };
}

function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  db.prepare(
    `UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`
  ).run(nowIso(), tokenHash);
}

function deleteRefreshToken(token) {
  const tokenHash = hashToken(token);
  db.prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`).run(tokenHash);
}

function validateRefreshToken(token) {
  const tokenHash = hashToken(token);
  const record = db
    .prepare(
      `
      SELECT rt.*, u.email, u.role
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = ?
    `
    )
    .get(tokenHash);

  if (!record) {
    return { valid: false, reason: 'not_found' };
  }

  if (record.revoked_at) {
    return { valid: false, reason: 'revoked' };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, record };
}

function rotateRefreshToken(token) {
  const validation = validateRefreshToken(token);
  if (!validation.valid) return validation;

  deleteRefreshToken(token);

  const { record } = validation;
  const { token: newToken, expiresAt } = issueRefreshToken(record.user_id);

  return {
    valid: true,
    record,
    newToken,
    newExpiresAt: expiresAt,
  };
}

module.exports = {
  signAccessToken,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  validateRefreshToken,
  ACCESS_TOKEN_TTL,
};
