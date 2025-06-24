const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const {
  validateProduct,
  validateReview,
  validatePagination,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering, sorting, and pagination
// @access  Public
router.get('/', validatePagination, optionalAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Build filter object
  const filter = { isActive: true };

  // Category filter
  if (req.query.category) {
    filter.category = req.query.category;
  }

  // Brand filter
  if (req.query.brand) {
    filter.brand = new RegExp(req.query.brand, 'i');
  }

  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
  }

  // Size filter
  if (req.query.size) {
    filter['variants.size'] = req.query.size;
  }

  // Color filter
  if (req.query.color) {
    filter['variants.color'] = new RegExp(req.query.color, 'i');
  }

  // In stock filter
  if (req.query.inStock === 'true') {
    filter['variants.inventory.quantity'] = { $gt: 0 };
  }

  // Featured filter
  if (req.query.featured === 'true') {
    filter.isFeatured = true;
  }

  // Sort options
  let sortBy = {};
  switch (req.query.sortBy) {
    case 'price_asc':
      sortBy.price = 1;
      break;
    case 'price_desc':
      sortBy.price = -1;
      break;
    case 'rating':
      sortBy.averageRating = -1;
      break;
    case 'newest':
      sortBy.createdAt = -1;
      break;
    case 'popular':
      sortBy.totalSales = -1;
      break;
    default:
      sortBy.createdAt = -1;
  }

  const products = await Product.find(filter)
    .populate('category', 'name slug')
    .select('-reviews') // Exclude reviews for list view
    .sort(sortBy)
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  });
}));

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', validatePagination, asyncHandler(async (req, res) => {
  const { q: searchTerm } = req.query;
  
  if (!searchTerm) {
    return res.status(400).json({
      success: false,
      message: 'Search term is required'
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const products = await Product.search(searchTerm, {
    limit,
    skip,
    filters: { isActive: true }
  });

  const total = await Product.countDocuments({
    $text: { $search: searchTerm },
    isActive: true
  });

  res.json({
    success: true,
    data: {
      products,
      searchTerm,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total
      }
    }
  });
}));

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;

  const products = await Product.find({ 
    isActive: true, 
    isFeatured: true 
  })
    .populate('category', 'name slug')
    .select('-reviews')
    .sort({ totalSales: -1 })
    .limit(limit);

  res.json({
    success: true,
    data: {
      products
    }
  });
}));

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/:id', validateObjectId, optionalAuth, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('reviews.user', 'firstName lastName')
    .populate('relatedProducts', 'name price images slug');

  if (!product || !product.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Increment view count
  product.viewCount += 1;
  await product.save();

  res.json({
    success: true,
    data: {
      product
    }
  });
}));

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Admin only)
router.post('/', authenticateToken, requireAdmin, validateProduct, asyncHandler(async (req, res) => {
  // Check if category exists
  const category = await Category.findById(req.body.category);
  if (!category) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category'
    });
  }

  const product = new Product(req.body);
  await product.save();

  await product.populate('category', 'name slug');

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: {
      product
    }
  });
}));

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin only)
router.put('/:id', authenticateToken, requireAdmin, validateObjectId, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // If category is being updated, check if it exists
  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('category', 'name slug');

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: {
      product: updatedProduct
    }
  });
}));

// @route   DELETE /api/products/:id
// @desc    Delete product (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, validateObjectId, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Soft delete by setting isActive to false
  product.isActive = false;
  await product.save();

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
}));

// @route   POST /api/products/:id/reviews
// @desc    Add review to product
// @access  Private
router.post('/:id/reviews', authenticateToken, validateObjectId, validateReview, asyncHandler(async (req, res) => {
  const { rating, title, comment } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product || !product.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Check if user already reviewed this product
  const existingReview = product.reviews.find(
    review => review.user.toString() === req.user._id.toString()
  );

  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this product'
    });
  }

  // Add review
  const review = {
    user: req.user._id,
    rating,
    title,
    comment
  };

  product.reviews.push(review);
  await product.save();

  await product.populate('reviews.user', 'firstName lastName');

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
    data: {
      review: product.reviews[product.reviews.length - 1]
    }
  });
}));

// @route   PUT /api/products/:id/reviews/:reviewId
// @desc    Update review
// @access  Private (Review owner only)
router.put('/:id/reviews/:reviewId', authenticateToken, validateObjectId, validateReview, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const review = product.reviews.id(req.params.reviewId);
  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  // Check if user owns the review or is admin
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own reviews'
    });
  }

  // Update review
  const { rating, title, comment } = req.body;
  review.rating = rating;
  review.title = title;
  review.comment = comment;

  await product.save();

  res.json({
    success: true,
    message: 'Review updated successfully',
    data: {
      review
    }
  });
}));

// @route   DELETE /api/products/:id/reviews/:reviewId
// @desc    Delete review
// @access  Private (Review owner or admin)
router.delete('/:id/reviews/:reviewId', authenticateToken, validateObjectId, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const review = product.reviews.id(req.params.reviewId);
  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  // Check if user owns the review or is admin
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own reviews'
    });
  }

  review.remove();
  await product.save();

  res.json({
    success: true,
    message: 'Review deleted successfully'
  });
}));

module.exports = router;