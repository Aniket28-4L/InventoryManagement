import mongoose from 'mongoose';
const storeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: '' }
}, { timestamps: true });
export default mongoose.model('Store', storeSchema);
