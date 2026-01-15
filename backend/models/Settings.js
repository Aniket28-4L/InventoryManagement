import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  company: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    taxId: { type: String, default: '' },
    logo: { type: String, default: '' }
  },
  inventory: {
    autoStockAlert: { type: Boolean, default: true },
    defaultLowStockThreshold: { type: Number, default: 5 },
    allowNegativeStock: { type: Boolean, default: false },
    requireApprovalForTransfer: { type: Boolean, default: true }
  },
  barcode: {
    format: { type: String, enum: ['CODE128', 'EAN13', 'UPC'], default: 'CODE128' },
    autoGenerate: { type: Boolean, default: true },
    prefix: { type: String, default: '' }
  },
  notifications: {
    emailOnLowStock: { type: Boolean, default: true },
    emailOnStockTransfer: { type: Boolean, default: true },
    emailOnNewUser: { type: Boolean, default: true }
  },
  permissions: {
    staffCanEditProducts: { type: Boolean, default: false },
    staffCanTransferStock: { type: Boolean, default: true },
    viewerCanSeeReports: { type: Boolean, default: true }
  }
}, { timestamps: true });

// Ensure only one settings document exists
settingsSchema.statics.getSingleton = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('Settings', settingsSchema);