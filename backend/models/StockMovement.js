import mongoose from 'mongoose';
const stockMovementSchema = new mongoose.Schema({
  type: { type: String, enum: ['IN', 'OUT', 'TRANSFER', 'ADJUST', 'RETURN', 'DAMAGED', 'EXPIRED'], required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  qty: { type: Number, required: true },
  unitCost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  fromStore: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  toStore: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  fromLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  toLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  reference: {
    type: { type: String, enum: ['purchase_order', 'sales_order', 'transfer_order', 'adjustment', 'return'] },
    number: { type: String },
    id: { type: mongoose.Schema.Types.ObjectId }
  },
  reason: { type: String, default: '' },
  notes: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'], default: 'COMPLETED' },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  serialNumbers: [{ type: String }]
}, { timestamps: true });
export default mongoose.model('StockMovement', stockMovementSchema);

