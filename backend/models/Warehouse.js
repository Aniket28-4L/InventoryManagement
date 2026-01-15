import mongoose from 'mongoose';
const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' }
  },
  contact: {
    manager: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  configuration: {
    zones: [{ type: String }],
    aisles: [{ type: String }],
    shelfTypes: [{ type: String }],
    binTypes: [{ type: String }]
  },
  capacity: {
    totalArea: { type: Number, default: 0 },
    usableArea: { type: Number, default: 0 },
    maxPallets: { type: Number, default: 0 },
    maxWeight: { type: Number, default: 0 }
  },
  operatingHours: {
    monday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
    tuesday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
    wednesday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
    thursday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
    friday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
    saturday: { open: { type: String, default: '09:00' }, close: { type: String, default: '17:00' } },
    sunday: { open: { type: String, default: 'closed' }, close: { type: String, default: 'closed' } }
  },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: '' }
}, { timestamps: true });
export default mongoose.model('Warehouse', warehouseSchema);

