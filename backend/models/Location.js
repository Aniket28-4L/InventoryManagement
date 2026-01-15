import mongoose from 'mongoose';
const locationSchema = new mongoose.Schema({
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  warehouseCode: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // Auto-generated location code
  zone: { type: String, required: true },
  aisle: { type: String, default: '' },
  shelf: { type: String, required: true },
  bin: { type: String, required: true },
  level: { type: String, default: '1' },
  position: { type: String, default: '' },
  type: { type: String, enum: ['storage', 'receiving', 'shipping', 'quarantine', 'damaged'], default: 'storage' },
  capacity: {
    maxWeight: { type: Number, default: 0 },
    maxVolume: { type: Number, default: 0 },
    maxPallets: { type: Number, default: 0 }
  },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    unit: { type: String, default: 'cm' }
  },
  barcode: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, { timestamps: true });
locationSchema.index({ warehouse: 1, zone: 1, shelf: 1, bin: 1 }, { unique: true });
export default mongoose.model('Location', locationSchema);

