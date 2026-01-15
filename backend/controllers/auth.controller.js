import User from '../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: role || 'Viewer' });
    const token = signAccessToken(user);
    const refresh = signRefreshToken(user);
    res.json({ success: true, token, refreshToken: refresh, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const defaultEmail = process.env.DEFAULT_USER_EMAIL || 'abc@gmail.com';
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || '12345';
    let user = await User.findOne({ email }).select('+password');

    if (!user && email === defaultEmail && password === defaultPassword) {
      const createdUser = await User.create({
        name: process.env.DEFAULT_USER_NAME || 'Default Admin',
        email: defaultEmail,
        password: defaultPassword,
        role: process.env.DEFAULT_USER_ROLE || 'Admin'
      });
      user = await User.findById(createdUser._id).select('+password');
    }

    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signAccessToken(user);
    const refresh = signRefreshToken(user);
    res.json({ success: true, token, refreshToken: refresh, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).lean();
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Missing refresh token' });
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });
    const token = signAccessToken(user);
    const refreshNew = signRefreshToken(user);
    res.json({ success: true, token, refreshToken: refreshNew });
  } catch (e) { next(e); }
}

export async function logout(req, res, next) {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token. However, we can add token blacklisting here if needed.
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (e) { next(e); }
}

