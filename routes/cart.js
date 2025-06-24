const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { validateAddToCart, validateUpdateCartItem, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const cart = await Cart.getOrCreateCart(req.user._id);

  res.json({
    success: true,
    data: {
      cart
    }
  });
}));

// @route   POST /api/cart/items
// @desc    Add item to cart
// @access  Private
router.post('/items', authenticateToken, validateAddToCart, asyncHandler(async (req, res) => {
  const { productId, variant, quantity } = req.body;

  // Verify product exists and is active
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Find the specific variant
  const productVariant = product.variants.find(v => v.sku === variant.sku);
  if (!productVariant) {
    return res.status(400).json({
      success: false,
      message: 'Product variant not found'
    });
  }

  // Check inventory
  if (productVariant.inventory.quantity < quantity) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient inventory',
      availableQuantity: productVariant.inventory.quantity
    });
  }

  // Get or create cart
  const cart = await Cart.getOrCreateCart(req.user._id);

  // Add item to cart
  const price = productVariant.price || product.price;
  await cart.addItem(productId, variant, quantity, price);

  // Populate cart with product details
  await cart.populate('items.product', 'name images slug');

  res.json({
    success: true,
    message: 'Item added to cart successfully',
    data: {
      cart
    }
  });
}));

// @route   PUT /api/cart/items/:itemId
// @desc    Update cart item quantity
// @access  Private
router.put('/items/:itemId', authenticateToken, validateUpdateCartItem, asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  // Check if item exists
  const item = cart.items.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Cart item not found'
    });
  }

  // Verify inventory for new quantity
  const product = await Product.findById(item.product);
  const productVariant = product.variants.find(v => v.sku === item.variant.sku);
  
  if (productVariant.inventory.quantity < quantity) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient inventory',
      availableQuantity: productVariant.inventory.quantity
    });
  }

  // Update quantity
  await cart.updateItemQuantity(req.params.itemId, quantity);
  
  // Populate cart with product details
  await cart.populate('items.product', 'name images slug');

  res.json({
    success: true,
    message: 'Cart item updated successfully',
    data: {
      cart
    }
  });
}));

// @route   DELETE /api/cart/items/:itemId
// @desc    Remove item from cart
// @access  Private
router.delete('/items/:itemId', authenticateToken, validateObjectId, asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  await cart.removeItem(req.params.itemId);

  res.json({
    success: true,
    message: 'Item removed from cart successfully',
    data: {
      cart
    }
  });
}));

// @route   DELETE /api/cart
// @desc    Clear entire cart
// @access  Private
router.delete('/', authenticateToken, asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  await cart.clearCart();

  res.json({
    success: true,
    message: 'Cart cleared successfully',
    data: {
      cart
    }
  });
}));

// @route   GET /api/cart/summary
// @desc    Get cart summary (total items, total price)
// @access  Private
router.get('/summary', authenticateToken, asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  
  if (!cart) {
    return res.json({
      success: true,
      data: {
        summary: {
          totalItems: 0,
          totalPrice: 0,
          itemCount: 0
        }
      }
    });
  }

  res.json({
    success: true,
    data: {
      summary: cart.summary
    }
  });
}));

module.exports = router;