import User from '../models/User.js';

export async function listUsers(req, res, next) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build search query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const total = await User.countDocuments(query);
    
    // Fetch paginated users
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const data = users.map((user) => ({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }));
    
    const pages = Math.ceil(total / limitNum);
    
    res.json({ 
      success: true, 
      data: {
        users: data,
        page: pageNum,
        total,
        pages
      }
    });
  } catch (e) { next(e); }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role, phone, department, isActive } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }
    
    // Check if email already exists
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }
    
    // Create user
    const user = await User.create({ 
      name, 
      email: email.toLowerCase(), 
      password, 
      role: role || 'Viewer',
      phone: phone || '',
      department: department || '',
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.json({ 
      success: true, 
      data: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone,
        department: user.department,
        isActive: user.isActive
      } 
    });
  } catch (e) {
    // Handle Mongoose validation errors
    if (e.name === 'ValidationError') {
      const errors = Object.values(e.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: errors.join(', ') 
      });
    }
    // Handle duplicate key error (unique constraint)
    if (e.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }
    // Pass other errors to error handler
    next(e);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { name, role, email, phone, department, isActive } = req.body;
    const updateData = { name, role, email, phone, department };
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.json({ 
      success: true, 
      data: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone,
        department: user.department,
        isActive: user.isActive
      } 
    });
  } catch (e) { next(e); }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ 
      success: true, 
      data: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone || '',
        department: user.department || '',
        isActive: user.isActive
      } 
    });
  } catch (e) { next(e); }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true });
  } catch (e) { next(e); }
}

