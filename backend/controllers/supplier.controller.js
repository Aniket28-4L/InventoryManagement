import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import { validationResult } from 'express-validator';

// Get all suppliers
export const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, category, sortBy = 'name' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (category) query.category = category;

    const sortOptions = {};
    sortOptions[sortBy] = 1;

    const suppliers = await Supplier.find(query)
      .populate('products.product', 'name sku category')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Supplier.countDocuments(query);

    res.json({
      success: true,
      data: suppliers,
      suppliers,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching suppliers', 
      error: error.message 
    });
  }
};

// Get supplier by ID
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('products.product', 'name sku category price cost')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!supplier) {
      return res.status(404).json({ 
        success: false,
        message: 'Supplier not found' 
      });
    }

    // Get related products count and total value
    const productStats = await Product.aggregate([
      { $match: { supplier: supplier._id } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: supplier,
      supplier,
      productStats: productStats[0] || { totalProducts: 0, avgPrice: 0, totalValue: 0 }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching supplier', 
      error: error.message 
    });
  }
};

// Create new supplier
export const createSupplier = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Check if supplier code already exists (only if code is provided)
    if (req.body.code) {
      const existingSupplier = await Supplier.findOne({ 
        code: req.body.code 
      });
      
      if (existingSupplier) {
        return res.status(400).json({ 
          success: false,
          message: 'Supplier with this code already exists' 
        });
      }
    }

    const supplier = new Supplier({
      ...req.body,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id
    });

    await supplier.save();
    
    const populatedSupplier = await Supplier.findById(supplier._id)
      .populate('products.product', 'name sku category')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedSupplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors
    });
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors.map(msg => ({ msg }))
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({ 
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating supplier', 
      error: error.message 
    });
  }
};

// Update supplier
export const updateSupplier = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ 
        success: false,
        message: 'Supplier not found' 
      });
    }

    // Check if supplier code already exists (excluding current supplier)
    if (req.body.code && req.body.code !== supplier.code) {
      const existingSupplier = await Supplier.findOne({ 
        code: req.body.code,
        _id: { $ne: req.params.id }
      });
      
      if (existingSupplier) {
        return res.status(400).json({ 
          success: false,
          message: 'Supplier with this code already exists' 
        });
      }
    }

    Object.assign(supplier, req.body);
    supplier.lastModifiedBy = req.user.id;

    await supplier.save();
    
    const updatedSupplier = await Supplier.findById(supplier._id)
      .populate('products.product', 'name sku category')
      .lean();

    res.json({
      success: true,
      data: updatedSupplier
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error updating supplier', 
      error: error.message 
    });
  }
};

// Delete supplier
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ 
        success: false,
        message: 'Supplier not found' 
      });
    }

    // Check if supplier has associated products
    const productCount = await Product.countDocuments({ supplier: req.params.id });
    
    if (productCount > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete supplier with associated products' 
      });
    }

    await supplier.deleteOne();
    res.json({ 
      success: true,
      message: 'Supplier deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error deleting supplier', 
      error: error.message 
    });
  }
};

// Add product to supplier
export const addProductToSupplier = async (req, res) => {
  try {
    const { supplierId, productId } = req.params;
    const { sku, supplierSku, cost, minimumOrderQty, leadTime, isPreferred } = req.body;

    const supplier = await Supplier.findById(supplierId);
    const product = await Product.findById(productId);

    if (!supplier || !product) {
      return res.status(404).json({ 
        success: false,
        message: 'Supplier or product not found' 
      });
    }

    // Check if product is already in supplier's products array
    const existingProduct = supplier.products.find(
      p => p.product && p.product.toString() === productId
    );

    if (!existingProduct) {
      // Add product to supplier's products array
      supplier.products.push({
        product: productId,
        sku: sku || product.sku,
        supplierSku: supplierSku || product.sku,
        cost: cost || product.cost || 0,
        minimumOrderQty: minimumOrderQty || 1,
        leadTime: leadTime || 0,
        isPreferred: isPreferred || false
      });
      await supplier.save();
    }

    // Update product's supplier if it has a supplier field
    if (product.supplier !== undefined) {
      product.supplier = supplierId;
      await product.save();
    }

    const updatedSupplier = await Supplier.findById(supplierId)
      .populate('products.product', 'name sku category')
      .lean();

    res.json({ 
      success: true,
      message: 'Product added to supplier successfully',
      data: updatedSupplier
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error adding product to supplier', 
      error: error.message 
    });
  }
};

// Remove product from supplier
export const removeProductFromSupplier = async (req, res) => {
  try {
    const { supplierId, productId } = req.params;

    const supplier = await Supplier.findById(supplierId);
    const product = await Product.findById(productId);

    if (!supplier || !product) {
      return res.status(404).json({ 
        success: false,
        message: 'Supplier or product not found' 
      });
    }

    // Remove product from supplier's products array
    supplier.products = supplier.products.filter(
      p => !p.product || p.product.toString() !== productId
    );
    await supplier.save();

    // Remove supplier from product if it has a supplier field
    if (product.supplier !== undefined) {
      product.supplier = null;
      await product.save();
    }

    const updatedSupplier = await Supplier.findById(supplierId)
      .populate('products.product', 'name sku category')
      .lean();

    res.json({ 
      success: true,
      message: 'Product removed from supplier successfully',
      data: updatedSupplier
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error removing product from supplier', 
      error: error.message 
    });
  }
};

// Get supplier performance metrics
export const getSupplierPerformance = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { startDate, endDate } = req.query;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ 
        success: false,
        message: 'Supplier not found' 
      });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get product statistics
    const productStats = await Product.aggregate([
      { $match: { supplier: supplier._id, ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }) } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          avgCost: { $avg: '$cost' },
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
        }
      }
    ]);

    // Calculate performance metrics
    const performance = {
      totalProducts: productStats[0]?.totalProducts || 0,
      avgPrice: productStats[0]?.avgPrice || 0,
      avgCost: productStats[0]?.avgCost || 0,
      totalValue: productStats[0]?.totalValue || 0,
      profitMargin: productStats[0]?.avgPrice && productStats[0]?.avgCost 
        ? ((productStats[0].avgPrice - productStats[0].avgCost) / productStats[0].avgPrice * 100).toFixed(2)
        : 0,
      reliabilityScore: supplier.rating || 0,
      onTimeDelivery: supplier.onTimeDelivery || 0,
      qualityRating: supplier.qualityRating || 0
    };

    res.json({
      success: true,
      data: {
        supplier: supplier.name,
        performance,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching supplier performance', 
      error: error.message 
    });
  }
};

// Export suppliers data
export const exportSuppliers = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const suppliers = await Supplier.find()
      .populate('products.product', 'name sku category price cost')
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = suppliers.map(supplier => ({
        Code: supplier.code,
        Name: supplier.name,
        CompanyName: supplier.companyName,
        Email: supplier.contact?.email || '',
        Phone: supplier.contact?.phone || '',
        Status: supplier.status,
        Rating: supplier.performance?.rating || 0,
        TotalProducts: supplier.products.length,
        CreatedAt: supplier.createdAt,
        UpdatedAt: supplier.updatedAt
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="suppliers.csv"');
      
      // Simple CSV generation
      const headers = Object.keys(csvData[0] || {}).join(',');
      const rows = csvData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: suppliers
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error exporting suppliers', 
      error: error.message 
    });
  }
};