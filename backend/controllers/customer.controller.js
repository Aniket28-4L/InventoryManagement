import Customer from '../models/Customer.js';
import { validationResult } from 'express-validator';

// Get all customers
export const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, type, sortBy = 'name' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (type) query.type = type;

    const sortOptions = {};
    sortOptions[sortBy] = 1;

    const customers = await Customer.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Customer.countDocuments(query);

    res.json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching customers', 
      error: error.message 
    });
  }
};

// Get customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching customer', 
      error: error.message 
    });
  }
};

// Create new customer
export const createCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if customer code already exists
    const existingCustomer = await Customer.findOne({ 
      code: req.body.code 
    });
    
    if (existingCustomer) {
      return res.status(400).json({ 
        message: 'Customer with this code already exists' 
      });
    }

    // Check if email already exists
    if (req.body.email) {
      const existingEmail = await Customer.findOne({ 
        email: req.body.email 
      });
      
      if (existingEmail) {
        return res.status(400).json({ 
          message: 'Customer with this email already exists' 
        });
      }
    }

    const customer = new Customer({
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating customer', 
      error: error.message 
    });
  }
};

// Update customer
export const updateCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if customer code already exists (excluding current customer)
    if (req.body.code && req.body.code !== customer.code) {
      const existingCustomer = await Customer.findOne({ 
        code: req.body.code,
        _id: { $ne: req.params.id }
      });
      
      if (existingCustomer) {
        return res.status(400).json({ 
          message: 'Customer with this code already exists' 
        });
      }
    }

    // Check if email already exists (excluding current customer)
    if (req.body.email && req.body.email !== customer.email) {
      const existingEmail = await Customer.findOne({ 
        email: req.body.email,
        _id: { $ne: req.params.id }
      });
      
      if (existingEmail) {
        return res.status(400).json({ 
          message: 'Customer with this email already exists' 
        });
      }
    }

    Object.assign(customer, req.body);
    customer.updatedBy = req.user.id;

    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating customer', 
      error: error.message 
    });
  }
};

// Delete customer
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.remove();
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting customer', 
      error: error.message 
    });
  }
};

// Get customer statistics
export const getCustomerStats = async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          activeCustomers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveCustomers: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          byType: {
            $push: {
              type: '$type',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          totalCustomers: 1,
          activeCustomers: 1,
          inactiveCustomers: 1,
          byType: {
            $reduce: {
              input: '$byType',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  { $arrayToObject: [[['$$this.type', '$$this.count']]] }
                ]
              }
            }
          }
        }
      }
    ]);

    const recentCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email status type createdAt')
      .lean();

    res.json({
      stats: stats[0] || { 
        totalCustomers: 0, 
        activeCustomers: 0, 
        inactiveCustomers: 0, 
        byType: {} 
      },
      recent: recentCustomers
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching customer statistics', 
      error: error.message 
    });
  }
};

// Search customers
export const searchCustomers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const customers = await Customer.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ],
      status: 'active'
    })
    .select('name code email phone type')
    .limit(parseInt(limit))
    .lean();

    res.json(customers);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error searching customers', 
      error: error.message 
    });
  }
};

// Export customers data
export const exportCustomers = async (req, res) => {
  try {
    const { format = 'json', status, type } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const customers = await Customer.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = customers.map(customer => ({
        Code: customer.code,
        Name: customer.name,
        Email: customer.email,
        Phone: customer.phone,
        Type: customer.type,
        Status: customer.status,
        Company: customer.company,
        TaxId: customer.taxId,
        BillingAddress: customer.addresses?.billing ? 
          `${customer.addresses.billing.street}, ${customer.addresses.billing.city}, ${customer.addresses.billing.state} ${customer.addresses.billing.zipCode}` : '',
        ShippingAddress: customer.addresses?.shipping ? 
          `${customer.addresses.shipping.street}, ${customer.addresses.shipping.city}, ${customer.addresses.shipping.state} ${customer.addresses.shipping.zipCode}` : '',
        CreatedAt: customer.createdAt,
        UpdatedAt: customer.updatedAt
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
      
      // Simple CSV generation
      const headers = Object.keys(csvData[0] || {}).join(',');
      const rows = csvData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      
      res.send(csv);
    } else {
      res.json(customers);
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error exporting customers', 
      error: error.message 
    });
  }
};

// Bulk update customer status
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { customerIds, status } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ message: 'Customer IDs are required' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await Customer.updateMany(
      { _id: { $in: customerIds } },
      { 
        status,
        updatedBy: req.user.id,
        updatedAt: new Date()
      }
    );

    res.json({
      message: `Updated ${result.modifiedCount} customers to ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error bulk updating customers', 
      error: error.message 
    });
  }
};