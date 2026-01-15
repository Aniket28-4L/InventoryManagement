import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'warning', 'error', 'success', 'low_stock', 'expiry_warning', 'system'], 
    default: 'info' 
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  recipient: {
    type: { type: String, enum: ['user', 'role', 'all'], default: 'user' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String }
  },
  data: {
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    relatedType: { type: String },
    actionUrl: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  status: { 
    type: String, 
    enum: ['unread', 'read', 'archived', 'deleted'], 
    default: 'unread' 
  },
  readAt: { type: Date },
  expiresAt: { type: Date },
  isSystem: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

notificationSchema.index({ 'recipient.user': 1, status: 1, createdAt: -1 });
notificationSchema.index({ 'recipient.role': 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Notification', notificationSchema);