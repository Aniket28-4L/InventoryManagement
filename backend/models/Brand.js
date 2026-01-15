import mongoose from 'mongoose';
const brandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true, sparse: true },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  website: { type: String, default: '' },
  contact: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });
export default mongoose.model('Brand', brandSchema);

