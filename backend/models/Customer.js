import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  code: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  companyName: { type: String, required: true },
  type: { type: String, enum: ['individual', 'business'], default: 'business' },
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
  billingAddress: {
    sameAsShipping: { type: Boolean, default: true },
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' }
  },
  business: {
    taxId: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    website: { type: String, default: '' },
    industry: { type: String, default: '' },
    paymentTerms: { type: String, default: '' },
    creditLimit: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  preferences: {
    preferredWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    preferredShipping: { type: String, default: '' },
    preferredPayment: { type: String, default: '' },
    language: { type: String, default: 'en' }
  },
  performance: {
    rating: { type: Number, min: 1, max: 5, default: 3 },
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastOrderDate: { type: Date }
  },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  notes: { type: String, default: '' },
  tags: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

customerSchema.index({ name: 1, companyName: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ 'contact.email': 1 });

export default mongoose.model('Customer', customerSchema);