import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function auth(required = true) {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        if (!required) return next();
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
      const user = await User.findById(payload.sub).lean();
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
      req.user = { id: user._id.toString(), role: user.role, email: user.email, name: user.name };
      next();
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  };
}

export function permit(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Forbidden' });
    next();
  };
}

