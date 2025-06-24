const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [300, 'Short description cannot be more than 300 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand name cannot be more than 50 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  comparePrice: {
    type: Number,
    min: [0, 'Compare price cannot be negative']
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  variants: [{
    color: {
      type: String,
      required: true,
      trim: true
    },
    colorCode: String, // Hex color code
    size: {
      type: String,
      required: true,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    },
    sku: {
      type: String,
      required: true,
      uppercase: true
    },
    price: Number,
    inventory: {
      quantity: {
        type: Number,
        required: true,
        min: [0, 'Inventory cannot be negative'],
        default: 0
      },
      threshold: {
        type: Number,
        default: 5 // Low stock threshold
      }
    },
    weight: Number, // in grams
    dimensions: {
      length: Number, // in cm
      width: Number,
      height: Number
    }
  }],
  material: {
    type: String,
    trim: true
  },
  careInstructions: [String],
  features: [String],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isDigital: {
    type: Boolean,
    default: false
  },
  weight: {
    type: Number,
    default: 0 // in grams
  },
  dimensions: {
    length: Number, // in cm
    width: Number,
    height: Number
  },
  shipping: {
    isShippable: {
      type: Boolean,
      default: true
    },
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: String,
    comment: String,
    verified: {
      type: Boolean,
      default: false
    },
    helpful: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalSales: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total inventory across all variants
productSchema.virtual('totalInventory').get(function() {
  return this.variants.reduce((total, variant) => total + variant.inventory.quantity, 0);
});

// Virtual for in stock status
productSchema.virtual('inStock').get(function() {
  return this.totalInventory > 0;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

// Virtual for on sale status
productSchema.virtual('onSale').get(function() {
  return this.comparePrice && this.comparePrice > this.price;
});

// Indexes
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ totalSales: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ 'variants.sku': 1 });

// Text search index
productSchema.index({
  name: 'text',
  description: 'text',
  shortDescription: 'text',
  brand: 'text',
  tags: 'text'
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

// Pre-save middleware to calculate average rating
productSchema.pre('save', function(next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = Number((totalRating / this.reviews.length).toFixed(1));
    this.totalReviews = this.reviews.length;
  }
  next();
});

// Static method to get products by category
productSchema.statics.getByCategory = function(categoryId, options = {}) {
  const {
    limit = 10,
    skip = 0,
    sort = { createdAt: -1 },
    includeInactive = false
  } = options;

  const query = { category: categoryId };
  if (!includeInactive) {
    query.isActive = true;
  }

  return this.find(query)
    .populate('category', 'name slug')
    .limit(limit)
    .skip(skip)
    .sort(sort);
};

// Static method to search products
productSchema.statics.search = function(searchTerm, options = {}) {
  const {
    limit = 10,
    skip = 0,
    sort = { score: { $meta: 'textScore' } },
    filters = {}
  } = options;

  const query = {
    $text: { $search: searchTerm },
    isActive: true,
    ...filters
  };

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('category', 'name slug')
    .limit(limit)
    .skip(skip)
    .sort(sort);
};

// Instance method to add review
productSchema.methods.addReview = function(userId, rating, title, comment) {
  this.reviews.push({
    user: userId,
    rating,
    title,
    comment,
    createdAt: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);