import express from 'express';
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
  getNotificationStats,
  sendNotificationToUsers,
  sendNotificationToRole,
  sendBroadcastNotification
} from '../controllers/notification.controller.js';
import { auth } from '../middlewares/auth.js';
import { permit } from '../middlewares/auth.js';
import { body } from 'express-validator';

const router = express.Router();

// All notification routes require authentication
router.use(auth());

// Get notifications and statistics
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.get('/:id', getNotificationById);

// Mark notifications as read
router.patch('/:id/read', markAsRead);
router.patch('/mark-all-read', markAllAsRead);

// Create notifications (admin/manager only)
router.post('/', [
  permit('Admin', 'Manager'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid notification type'),
  body('priority').isIn(['low', 'medium', 'high']).withMessage('Invalid priority level'),
  body('recipient').optional().isMongoId().withMessage('Invalid recipient ID'),
  body('recipientRole').optional().isIn(['Admin', 'Manager', 'Staff']).withMessage('Invalid recipient role'),
  body('relatedData').optional().isObject().withMessage('Related data must be an object')
], createNotification);

// Send notifications to specific users
router.post('/send-to-users', [
  permit('Admin', 'Manager'),
  body('userIds').isArray().withMessage('User IDs must be an array'),
  body('userIds.*').isMongoId().withMessage('Each user ID must be valid'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid notification type'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority level')
], sendNotificationToUsers);

// Send notification to role
router.post('/send-to-role', [
  permit('Admin', 'Manager'),
  body('role').isIn(['Admin', 'Manager', 'Staff']).withMessage('Invalid role'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid notification type'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority level')
], sendNotificationToRole);

// Send broadcast notification
router.post('/broadcast', [
  permit('Admin'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid notification type'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority level')
], sendBroadcastNotification);

// Delete notification
router.delete('/:id', deleteNotification);

export default router;