const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateCategory, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .populate('subcategories');

  res.json({
    success: true,
    data: {
      categories
    }
  });
}));

// @route   GET /api/categories/tree
// @desc    Get category tree structure
// @access  Public
router.get('/tree', asyncHandler(async (req, res) => {
  const categoryTree = await Category.getCategoryTree();

  res.json({
    success: true,
    data: {
      categoryTree
    }
  });
}));

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Public
router.get('/:id', validateObjectId, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
    .populate('subcategories')
    .populate('parentCategory', 'name slug');

  if (!category || !category.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  res.json({
    success: true,
    data: {
      category
    }
  });
}));

// @route   GET /api/categories/:id/products
// @desc    Get products in a category
// @access  Public
router.get('/:id/products', validateObjectId, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const category = await Category.findById(req.params.id);
  if (!category || !category.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  const products = await Product.getByCategory(req.params.id, {
    limit,
    skip,
    sort: { createdAt: -1 }
  });

  const total = await Product.countDocuments({ 
    category: req.params.id, 
    isActive: true 
  });

  res.json({
    success: true,
    data: {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug
      },
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total
      }
    }
  });
}));

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (Admin only)
router.post('/', authenticateToken, requireAdmin, validateCategory, asyncHandler(async (req, res) => {
  const category = new Category(req.body);
  await category.save();

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: {
      category
    }
  });
}));

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (Admin only)
router.put('/:id', authenticateToken, requireAdmin, validateObjectId, validateCategory, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: {
      category: updatedCategory
    }
  });
}));

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, validateObjectId, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check if category has products
  const productsCount = await Product.countDocuments({ category: req.params.id });
  if (productsCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete category that contains products'
    });
  }

  await category.deleteOne();

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
}));

module.exports = router;