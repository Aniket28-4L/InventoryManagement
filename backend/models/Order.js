import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['purchase', 'sales', 'transfer', 'adjustment'], required: true },
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'approved', 'in_progress', 'completed', 'cancelled', 'rejected'], 
    default: 'draft' 
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  
  // Buyer Info
  buyerName: { type: String },

  // Related entities
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  
  // Dates
  orderDate: { type: Date, default: Date.now },
  requestedDate: { type: Date },
  promisedDate: { type: Date },
  completedDate: { type: Date },
  
  // Items
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    variant: {
      name: { type: String },
      values: [{ type: String }]
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'pcs' },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    batchNumber: { type: String },
    expiryDate: { type: Date },
    serialNumbers: [{ type: String }],
    notes: { type: String },
    status: { type: String, enum: ['pending', 'allocated', 'picked', 'packed', 'shipped', 'received'], default: 'pending' }
  }],
  
  // Financials
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  
  // Payment
  payment: {
    method: { type: String },
    status: { type: String, enum: ['pending', 'partial', 'paid', 'refunded'], default: 'pending' },
    paidAmount: { type: Number, default: 0 },
    paymentDate: { type: Date }
  },
  
  // Shipping
  shipping: {
    carrier: { type: String },
    trackingNumber: { type: String },
    method: { type: String },
    cost: { type: Number, default: 0 },
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, default: 'cm' }
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String }
    }
  },
  
  // References
  reference: {
    customerPO: { type: String },
    supplierQuote: { type: String },
    internalNotes: { type: String }
  },
  
  // Approvals
  approvals: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['approved', 'rejected'], required: true },
    comments: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Tracking
  history: [{
    status: { type: String },
    comments: { type: String },
    timestamp: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  notes: { type: String },
  tags: [{ type: String }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

orderSchema.pre('validate', async function(next) {
  try {
    if (this.isNew && !this.orderNumber) {
      const year = new Date().getFullYear();
      let seq = Math.floor(Date.now() % 10000);
      let attempts = 0;
      while (attempts < 1000) {
        const candidate = `INV-${year}-${String(seq).padStart(4, '0')}`;
        const exists = await mongoose.models.Order.exists({ orderNumber: candidate });
        if (!exists) { this.orderNumber = candidate; break; }
        seq = (seq + 1) % 10000;
        attempts++;
      }
      if (!this.orderNumber) {
        this.orderNumber = `INV-${year}-${Date.now()}`;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
});

orderSchema.index({ type: 1, status: 1 });
orderSchema.index({ customer: 1, orderDate: -1 });
orderSchema.index({ supplier: 1, orderDate: -1 });
orderSchema.index({ warehouse: 1, status: 1 });

orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.type.toUpperCase().substring(0, 2) + Date.now().toString().substring(4);
  }
  next();
});

export default mongoose.model('Order', orderSchema);
