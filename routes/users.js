const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validatePagination, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', authenticateToken, requireAdmin, validatePagination, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex }
    ];
  }

  const users = await User.find(filter)
    .select('-password -emailVerificationToken -passwordResetToken')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total
      }
    }
  });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin or Self)
router.get('/:id', authenticateToken, validateObjectId, requireOwnershipOrAdmin(), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -emailVerificationToken -passwordResetToken');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check ownership if not admin
  if (req.requireOwnership && user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: {
      user
    }
  });
}));

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or Self - limited fields for self)
router.put('/:id', authenticateToken, validateObjectId, requireOwnershipOrAdmin(), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check ownership if not admin
  if (req.requireOwnership && user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Define allowed fields based on user role
  let allowedFields;
  if (req.user.role === 'admin') {
    allowedFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'role', 'isActive', 'preferences'];
  } else {
    allowedFields = ['firstName', 'lastName', 'phoneNumber', 'preferences'];
  }

  // Build update object with only allowed fields
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-password -emailVerificationToken -passwordResetToken');

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: updatedUser
    }
  });
}));

// @route   DELETE /api/users/:id
// @desc    Deactivate user (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, validateObjectId, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot deactivate your own account'
    });
  }

  user.isActive = false;
  await user.save();

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
}));

// @route   POST /api/users/:id/addresses
// @desc    Add address to user
// @access  Private (Self only)
router.post('/:id/addresses', authenticateToken, validateObjectId, asyncHandler(async (req, res) => {
  // Only users can add addresses to their own account
  if (req.params.id !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only add addresses to your own account'
    });
  }

  const { type, street, city, state, zipCode, country, isDefault } = req.body;

  if (!type || !street || !city || !state || !zipCode) {
    return res.status(400).json({
      success: false,
      message: 'All address fields are required'
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // If this is set as default, remove default from other addresses of same type
  if (isDefault) {
    user.addresses.forEach(addr => {
      if (addr.type === type) {
        addr.isDefault = false;
      }
    });
  }

  const newAddress = {
    type,
    street,
    city,
    state,
    zipCode,
    country: country || 'United States',
    isDefault: isDefault || false
  };

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    data: {
      address: newAddress
    }
  });
}));

// @route   PUT /api/users/:id/addresses/:addressId
// @desc    Update user address
// @access  Private (Self only)
router.put('/:id/addresses/:addressId', authenticateToken, validateObjectId, asyncHandler(async (req, res) => {
  // Only users can update their own addresses
  if (req.params.id !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own addresses'
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const address = user.addresses.id(req.params.addressId);
  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  // Update address fields
  const { type, street, city, state, zipCode, country, isDefault } = req.body;
  
  if (type) address.type = type;
  if (street) address.street = street;
  if (city) address.city = city;
  if (state) address.state = state;
  if (zipCode) address.zipCode = zipCode;
  if (country) address.country = country;

  // Handle default address logic
  if (isDefault && !address.isDefault) {
    // Remove default from other addresses of same type
    user.addresses.forEach(addr => {
      if (addr.type === address.type && addr._id.toString() !== address._id.toString()) {
        addr.isDefault = false;
      }
    });
    address.isDefault = true;
  } else if (isDefault === false) {
    address.isDefault = false;
  }

  await user.save();

  res.json({
    success: true,
    message: 'Address updated successfully',
    data: {
      address
    }
  });
}));

// @route   DELETE /api/users/:id/addresses/:addressId
// @desc    Delete user address
// @access  Private (Self only)
router.delete('/:id/addresses/:addressId', authenticateToken, validateObjectId, asyncHandler(async (req, res) => {
  // Only users can delete their own addresses
  if (req.params.id !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own addresses'
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const address = user.addresses.id(req.params.addressId);
  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  address.remove();
  await user.save();

  res.json({
    success: true,
    message: 'Address deleted successfully'
  });
}));

// @route   GET /api/users/:id/orders
// @desc    Get user's orders
// @access  Private (Self or Admin)
router.get('/:id/orders', authenticateToken, validateObjectId, validatePagination, requireOwnershipOrAdmin(), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check ownership if not admin
  if (req.requireOwnership && user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const orders = await Order.getByUser(req.params.id, {
    limit,
    skip: (page - 1) * limit,
    status: req.query.status
  });

  const total = await Order.countDocuments({ 
    user: req.params.id,
    ...(req.query.status && { status: req.query.status })
  });

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total
      }
    }
  });
}));

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Private (Self or Admin)
router.get('/:id/stats', authenticateToken, validateObjectId, requireOwnershipOrAdmin(), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check ownership if not admin
  if (req.requireOwnership && user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Calculate user statistics
  const stats = await Order.aggregate([
    { $match: { user: user._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' },
        ordersByStatus: {
          $push: '$status'
        }
      }
    }
  ]);

  const userStats = stats[0] || {
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    ordersByStatus: []
  };

  // Count orders by status
  const statusCounts = {};
  userStats.ordersByStatus.forEach(status => {
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      stats: {
        totalOrders: userStats.totalOrders,
        totalSpent: userStats.totalSpent,
        averageOrderValue: userStats.averageOrderValue,
        ordersByStatus: statusCounts,
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
        totalAddresses: user.addresses.length
      }
    }
  });
}));

module.exports = router;