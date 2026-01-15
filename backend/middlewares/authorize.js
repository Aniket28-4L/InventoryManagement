import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Get token from header
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided, authorization denied'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is not valid'
        });
      }

      // Check if user has required role
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions'
        });
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
  };
};