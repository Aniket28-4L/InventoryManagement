import mongoose from 'mongoose';

const stockTransferSchema = new mongoose.Schema({
  transferNumber: { type: String, required: true, unique: true },
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }, // Optional for store transfers
  toStore: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }, // Optional for warehouse transfers
  fromLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  toLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    quantityReceived: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    variantValue: { type: String, default: '' }
  }],
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'in_transit', 'partially_received', 'completed', 'cancelled'], 
    default: 'draft' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shippedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedDate: { type: Date, default: Date.now },
  approvedDate: { type: Date },
  shippedDate: { type: Date },
  expectedDeliveryDate: { type: Date },
  receivedDate: { type: Date },
  trackingNumber: { type: String, default: '' },
  carrier: { type: String, default: '' },
  shippingCost: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  internalNotes: { type: String, default: '' },
  attachments: [{ type: String }]
}, { timestamps: true });

// Generate transfer number
stockTransferSchema.pre('save', async function(next) {
  if (this.isNew && !this.transferNumber) {
    try {
      // Use a more reliable method to generate unique transfer numbers
      let transferNumber;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        const count = await mongoose.model('StockTransfer').countDocuments();
        transferNumber = `TRF-${String(count + 1).padStart(6, '0')}`;
        
        // Check if this transfer number already exists
        const exists = await mongoose.model('StockTransfer').findOne({ transferNumber });
        if (!exists) {
          this.transferNumber = transferNumber;
          break;
        }
        attempts++;
      } while (attempts < maxAttempts);
      
      if (!this.transferNumber) {
        // Fallback: use timestamp-based number
        this.transferNumber = `TRF-${Date.now().toString().slice(-6)}`;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

export default mongoose.model('StockTransfer', stockTransferSchema);