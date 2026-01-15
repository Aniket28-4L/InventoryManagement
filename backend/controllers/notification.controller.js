import Notification from '../models/Notification.js';
import User from '../models/User.js';

export async function getNotifications(req, res, next) {
  try {
    const { page = 1, limit = 20, type, priority, read } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (read !== undefined) query.read = read === 'true';
    
    // Get notifications for the current user or broadcast notifications
    query.$or = [
      { recipient: req.user.id },
      { recipientRole: req.user.role },
      { isBroadcast: true }
    ];
    
    const notifications = await Notification.find(query)
      .populate('createdBy', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) { next(e); }
}

export async function getNotificationById(req, res, next) {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      $or: [
        { recipient: req.user.id },
        { recipientRole: req.user.role },
        { isBroadcast: true }
      ]
    })
      .populate('createdBy', 'name email')
      .populate('recipient', 'name email')
      .lean();
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, data: notification });
  } catch (e) { next(e); }
}

export async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { recipient: req.user.id },
          { recipientRole: req.user.role },
          { isBroadcast: true }
        ]
      },
      { read: true, readAt: new Date() },
      { new: true }
    ).lean();
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (e) { next(e); }
}

export async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      {
        read: false,
        $or: [
          { recipient: req.user.id },
          { recipientRole: req.user.role },
          { isBroadcast: true }
        ]
      },
      { read: true, readAt: new Date() }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (e) { next(e); }
}

export async function createNotification(req, res, next) {
  try {
    const { title, message, type, priority, recipient, recipientRole, relatedData } = req.body;
    
    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      recipient,
      recipientRole,
      relatedData,
      createdBy: req.user.id
    });
    
    await notification.save();
    await notification.populate('createdBy', 'name email');
    await notification.populate('recipient', 'name email');
    
    res.json({ success: true, data: notification });
  } catch (e) { next(e); }
}

export async function deleteNotification(req, res, next) {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      $or: [
        { recipient: req.user.id },
        { createdBy: req.user.id },
        { isBroadcast: true }
      ]
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (e) { next(e); }
}

export async function getNotificationStats(req, res, next) {
  try {
    const total = await Notification.countDocuments({
      $or: [
        { recipient: req.user.id },
        { recipientRole: req.user.role },
        { isBroadcast: true }
      ]
    });
    
    const unread = await Notification.countDocuments({
      read: false,
      $or: [
        { recipient: req.user.id },
        { recipientRole: req.user.role },
        { isBroadcast: true }
      ]
    });
    
    const byType = await Notification.aggregate([
      {
        $match: {
          $or: [
            { recipient: req.user.id },
            { recipientRole: req.user.role },
            { isBroadcast: true }
          ]
        }
      },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        total,
        unread,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (e) { next(e); }
}

export async function sendNotificationToUsers(req, res, next) {
  try {
    const { userIds, title, message, type, priority } = req.body;
    
    const notifications = [];
    for (const userId of userIds) {
      const notification = new Notification({
        title,
        message,
        type: type || 'info',
        priority: priority || 'medium',
        recipient: userId,
        createdBy: req.user.id
      });
      notifications.push(notification);
    }
    
    await Notification.insertMany(notifications);
    
    res.json({ success: true, message: 'Notifications sent successfully' });
  } catch (e) { next(e); }
}

export async function sendNotificationToRole(req, res, next) {
  try {
    const { role, title, message, type, priority } = req.body;
    
    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      recipientRole: role,
      createdBy: req.user.id,
      isBroadcast: false
    });
    
    await notification.save();
    
    res.json({ success: true, message: 'Notification sent to role successfully' });
  } catch (e) { next(e); }
}

export async function sendBroadcastNotification(req, res, next) {
  try {
    const { title, message, type, priority } = req.body;
    
    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      priority: priority || 'high',
      createdBy: req.user.id,
      isBroadcast: true
    });
    
    await notification.save();
    
    res.json({ success: true, message: 'Broadcast notification sent successfully' });
  } catch (e) { next(e); }
}