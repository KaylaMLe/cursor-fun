const { body, param, query, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

// Product validation rules
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('sku')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('SKU must be between 3 and 20 characters'),
  body('category')
    .isMongoId()
    .withMessage('Please provide a valid category ID'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('comparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number'),
  body('variants')
    .isArray({ min: 1 })
    .withMessage('At least one variant is required'),
  body('variants.*.color')
    .trim()
    .notEmpty()
    .withMessage('Variant color is required'),
  body('variants.*.size')
    .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'])
    .withMessage('Invalid size'),
  body('variants.*.sku')
    .trim()
    .notEmpty()
    .withMessage('Variant SKU is required'),
  body('variants.*.inventory.quantity')
    .isInt({ min: 0 })
    .withMessage('Inventory quantity must be a non-negative integer'),
  handleValidationErrors
];

// Category validation rules
const validateCategory = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid parent category ID'),
  handleValidationErrors
];

// Cart validation rules
const validateAddToCart = [
  body('productId')
    .isMongoId()
    .withMessage('Please provide a valid product ID'),
  body('variant.sku')
    .trim()
    .notEmpty()
    .withMessage('Variant SKU is required'),
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  handleValidationErrors
];

const validateUpdateCartItem = [
  param('itemId')
    .isMongoId()
    .withMessage('Please provide a valid item ID'),
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  handleValidationErrors
];

// Order validation rules
const validateCreateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('paymentMethod')
    .isIn(['credit_card', 'paypal', 'stripe', 'cash_on_delivery'])
    .withMessage('Invalid payment method'),
  body('shippingAddress.firstName')
    .trim()
    .notEmpty()
    .withMessage('Shipping first name is required'),
  body('shippingAddress.lastName')
    .trim()
    .notEmpty()
    .withMessage('Shipping last name is required'),
  body('shippingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Shipping street address is required'),
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('Shipping city is required'),
  body('shippingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('Shipping state is required'),
  body('shippingAddress.zipCode')
    .trim()
    .isPostalCode('US')
    .withMessage('Please provide a valid ZIP code'),
  body('billingAddress.firstName')
    .trim()
    .notEmpty()
    .withMessage('Billing first name is required'),
  body('billingAddress.lastName')
    .trim()
    .notEmpty()
    .withMessage('Billing last name is required'),
  body('billingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Billing street address is required'),
  body('billingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('Billing city is required'),
  body('billingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('Billing state is required'),
  body('billingAddress.zipCode')
    .trim()
    .isPostalCode('US')
    .withMessage('Please provide a valid ZIP code'),
  handleValidationErrors
];

// Review validation rules
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Review title cannot exceed 100 characters'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review comment cannot exceed 1000 characters'),
  handleValidationErrors
];

// Query parameter validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Please provide a valid ID'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validateProduct,
  validateCategory,
  validateAddToCart,
  validateUpdateCartItem,
  validateCreateOrder,
  validateReview,
  validatePagination,
  validateObjectId
};