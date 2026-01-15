import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  code: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  companyName: { type: String, required: true },
  contact: {
    person: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    mobile: { type: String, default: '' },
    fax: { type: String, default: '' }
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  business: {
    taxId: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    website: { type: String, default: '' },
    industry: { type: String, default: '' },
    paymentTerms: { type: String, default: '' },
    currency: { type: String, default: 'USD' }
  },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String },
    supplierSku: { type: String },
    cost: { type: Number, default: 0 },
    minimumOrderQty: { type: Number, default: 1 },
    leadTime: { type: Number, default: 0 }, // days
    isPreferred: { type: Boolean, default: false }
  }],
  performance: {
    rating: { type: Number, min: 1, max: 5, default: 3 },
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    averageDeliveryTime: { type: Number, default: 0 }, // days
    onTimeDeliveryRate: { type: Number, default: 0 } // percentage
  },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  notes: { type: String, default: '' },
  tags: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

supplierSchema.index({ name: 1, companyName: 1 });
supplierSchema.index({ status: 1 });
supplierSchema.index({ 'contact.email': 1 });

export default mongoose.model('Supplier', supplierSchema);