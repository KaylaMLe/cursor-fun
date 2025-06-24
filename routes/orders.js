const express = require('express');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateCreateOrder, validatePagination, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user's orders or all orders (admin)
// @access  Private
router.get('/', authenticateToken, validatePagination, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {};
  let orders;
  let total;

  if (req.user.role === 'admin') {
    // Admin can see all orders
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.userId) {
      query.user = req.query.userId;
    }

    orders = await Order.find(query)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    total = await Order.countDocuments(query);
  } else {
    // Regular users can only see their own orders
    query.user = req.user._id;
    if (req.query.status) {
      query.status = req.query.status;
    }

    orders = await Order.find(query)
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    total = await Order.countDocuments(query);
  }

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

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private (Owner or Admin)
router.get('/:id', authenticateToken, validateObjectId, requireOwnershipOrAdmin(), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email phoneNumber')
    .populate('items.product', 'name images slug');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check ownership if not admin
  if (req.requireOwnership && order.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: {
      order
    }
  });
}));

// @route   POST /api/orders
// @desc    Create new order from cart
// @access  Private
router.post('/', authenticateToken, validateCreateOrder, asyncHandler(async (req, res) => {
  const { paymentMethod, shippingAddress, billingAddress, coupon, notes } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cart is empty'
    });
  }

  // Verify inventory and prepare order items
  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of cart.items) {
    const product = cartItem.product;
    
    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        message: `Product ${product?.name || 'unknown'} is no longer available`
      });
    }

    const variant = product.variants.find(v => v.sku === cartItem.variant.sku);
    if (!variant) {
      return res.status(400).json({
        success: false,
        message: `Variant ${cartItem.variant.sku} is no longer available`
      });
    }

    if (variant.inventory.quantity < cartItem.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory for ${product.name}`,
        availableQuantity: variant.inventory.quantity
      });
    }

    const orderItem = {
      product: product._id,
      productSnapshot: {
        name: product.name,
        description: product.shortDescription || product.description,
        image: product.images[0]?.url,
        sku: product.sku
      },
      variant: cartItem.variant,
      quantity: cartItem.quantity,
      unitPrice: cartItem.price,
      totalPrice: cartItem.totalPrice
    };

    orderItems.push(orderItem);
    subtotal += cartItem.totalPrice;
  }

  // Calculate pricing
  const taxRate = 0.08; // 8% tax rate
  const shippingCost = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
  let discount = 0;

  // Apply coupon if provided
  if (coupon && coupon.code) {
    // In a real app, you'd validate the coupon against a coupons collection
    if (coupon.type === 'percentage') {
      discount = subtotal * (coupon.discount / 100);
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.discount, subtotal);
    }
  }

  const tax = (subtotal - discount) * taxRate;
  const total = subtotal + tax + shippingCost - discount;

  // Create order
  const order = new Order({
    user: req.user._id,
    items: orderItems,
    paymentMethod,
    pricing: {
      subtotal,
      tax: Math.round(tax * 100) / 100,
      shipping: shippingCost,
      discount,
      total: Math.round(total * 100) / 100
    },
    shippingAddress,
    billingAddress,
    coupon,
    notes: {
      customer: notes?.customer
    }
  });

  await order.save();

  // Update product inventory
  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.product);
    const variant = product.variants.find(v => v.sku === cartItem.variant.sku);
    variant.inventory.quantity -= cartItem.quantity;
    product.totalSales += cartItem.quantity;
    await product.save();
  }

  // Clear cart
  await cart.clearCart();

  // Populate order for response
  await order.populate('user', 'firstName lastName email');
  await order.populate('items.product', 'name images');

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      order
    }
  });
}));

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, validateObjectId, asyncHandler(async (req, res) => {
  const { status, message } = req.body;

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  await order.updateStatus(status, message);

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: {
      order
    }
  });
}));

// @route   PUT /api/orders/:id/shipping
// @desc    Update shipping information
// @access  Private (Admin only)
router.put('/:id/shipping', authenticateToken, requireAdmin, validateObjectId, asyncHandler(async (req, res) => {
  const { carrier, trackingNumber, estimatedDelivery } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      'shipping.carrier': carrier,
      'shipping.trackingNumber': trackingNumber,
      'shipping.estimatedDelivery': estimatedDelivery
    },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Add timeline entry
  await order.addTimelineEntry(
    'shipped',
    `Order shipped with ${carrier}. Tracking: ${trackingNumber}`
  );

  res.json({
    success: true,
    message: 'Shipping information updated successfully',
    data: {
      order
    }
  });
}));

// @route   POST /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private (Owner or Admin)
router.post('/:id/cancel', authenticateToken, validateObjectId, requireOwnershipOrAdmin(), asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check ownership if not admin
  if (req.requireOwnership && order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if order can be cancelled
  if (['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: 'Order cannot be cancelled in current status'
    });
  }

  // Update order status
  await order.updateStatus('cancelled', reason || 'Order cancelled by user');

  // Restore inventory
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      const variant = product.variants.find(v => v.sku === item.variant.sku);
      if (variant) {
        variant.inventory.quantity += item.quantity;
        product.totalSales -= item.quantity;
        await product.save();
      }
    }
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: {
      order
    }
  });
}));

// @route   GET /api/orders/analytics/summary
// @desc    Get order analytics summary
// @access  Private (Admin only)
router.get('/analytics/summary', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  
  const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
  const dateTo = to ? new Date(to) : new Date();

  const analytics = await Order.getAnalytics(dateFrom, dateTo);

  res.json({
    success: true,
    data: {
      analytics,
      period: {
        from: dateFrom,
        to: dateTo
      }
    }
  });
}));

// @route   GET /api/orders/:id/invoice
// @desc    Get order invoice
// @access  Private (Owner or Admin)
router.get('/:id/invoice', authenticateToken, validateObjectId, requireOwnershipOrAdmin(), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email')
    .populate('items.product', 'name sku');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Check ownership if not admin
  if (req.requireOwnership && order.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // In a real application, you would generate a PDF invoice here
  // For now, we'll return the order data formatted for invoice
  const invoice = {
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    customer: {
      name: order.user.fullName,
      email: order.user.email
    },
    billingAddress: order.billingAddress,
    shippingAddress: order.shippingAddress,
    items: order.items.map(item => ({
      name: item.productSnapshot.name,
      sku: item.variant.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    })),
    pricing: order.pricing,
    paymentMethod: order.paymentMethod
  };

  res.json({
    success: true,
    data: {
      invoice
    }
  });
}));

module.exports = router;