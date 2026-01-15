import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  barcode: { type: String, unique: true, sparse: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  variant: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
  variantValue: { type: String, default: '' },
  uom: { type: String, default: 'pcs' },
  cost: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  images: [{ type: String }],
  variants: [{
    option: { type: String },
    value: { type: String },
    qty: { type: Number, default: 0, min: 0 },
    sku: { type: String },
    barcode: { type: String },
    price: { type: Number },
    cost: { type: Number },
    images: [{ type: String }]
  }],
  description: { type: String },
  specifications: {
    weight: { type: Number, default: 0 },
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      unit: { type: String, default: 'cm' }
    },
    color: { type: String, default: '' },
    material: { type: String, default: '' },
    manufacturer: { type: String, default: '' },
    countryOfOrigin: { type: String, default: '' }
  },
  inventory: {
    lowStockThreshold: { type: Number, default: 5 },
    reorderPoint: { type: Number, default: 10 },
    maxStockLevel: { type: Number, default: 100 },
    allowBackorder: { type: Boolean, default: false }
  },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  status: { type: String, enum: ['active', 'inactive', 'discontinued'], default: 'active' },
  tags: [{ type: String }],
  notes: { type: String, default: '' },
  pdfUrl: { type: String, default: '' },
  pdfGeneratedAt: { type: Date }
}, { timestamps: true });

productSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

export default mongoose.model('Product', productSchema);

