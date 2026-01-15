import mongoose from 'mongoose';
const stockSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  variantValue: { type: String, default: '' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  warehouseCode: { type: String, required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  locationCode: { type: String },
  zone: { type: String, default: '' },
  shelf: { type: String, default: '' },
  bin: { type: String, default: '' },
  qty: { type: Number, default: 0, min: 0 },
  reservedQty: { type: Number, default: 0, min: 0 },
  availableQty: { type: Number, default: 0, min: 0 },
  unitCost: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  lastMovementDate: { type: Date },
  lastMovementType: { type: String },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  serialNumbers: [{ type: String }],
  status: { type: String, enum: ['available', 'reserved', 'damaged', 'expired', 'quarantine'], default: 'available' },
  notes: { type: String, default: '' }
}, { timestamps: true });
stockSchema.index({ product: 1, warehouse: 1, location: 1, store: 1, variantValue: 1 }, { unique: true, sparse: true });
export default mongoose.model('Stock', stockSchema);

