import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['stock_level', 'stock_movement', 'low_stock', 'warehouse_summary', 'product_performance', 'user_activity', 'custom'], 
    required: true 
  },
  description: { type: String, default: '' },
  filters: {
    dateRange: {
      start: { type: Date },
      end: { type: Date }
    },
    warehouses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    brands: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }],
    movementTypes: [{ type: String }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  configuration: {
    groupBy: { type: String, enum: ['product', 'warehouse', 'category', 'date', 'user'], default: 'product' },
    sortBy: { type: String, default: 'name' },
    sortOrder: { type: String, enum: ['asc', 'desc'], default: 'asc' },
    includeZeroStock: { type: Boolean, default: false },
    includeInactive: { type: Boolean, default: false },
    showDetails: { type: Boolean, default: true }
  },
  data: { type: mongoose.Schema.Types.Mixed }, // Store processed report data
  summary: {
    totalItems: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
    lastGenerated: { type: Date }
  },
  format: { type: String, enum: ['json', 'csv', 'pdf', 'xlsx'], default: 'json' },
  schedule: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
    recipients: [{ type: String }],
    lastSent: { type: Date }
  },
  isPublic: { type: Boolean, default: false },
  isScheduled: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);