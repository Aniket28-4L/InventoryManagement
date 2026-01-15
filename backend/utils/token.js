import jwt from 'jsonwebtoken';

export function signAccessToken(user) {
  const payload = { sub: user._id.toString(), role: user.role };
  const secret = process.env.JWT_SECRET || 'devsecret';
  const expiresIn = process.env.JWT_EXPIRES || '1d';
  return jwt.sign(payload, secret, { expiresIn });
}

export function signRefreshToken(user) {
  const payload = { sub: user._id.toString() };
  const secret = process.env.JWT_REFRESH_SECRET || 'devrefresh';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyRefreshToken(token) {
  const secret = process.env.JWT_REFRESH_SECRET || 'devrefresh';
  return jwt.verify(token, secret);
}

