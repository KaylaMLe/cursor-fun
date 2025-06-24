const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    color: String,
    size: String,
    sku: String
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for cart summary
cartSchema.virtual('summary').get(function() {
  return {
    totalItems: this.totalItems,
    totalPrice: this.totalPrice,
    itemCount: this.items.length
  };
});

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  // Calculate total items and total price
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalPrice = this.items.reduce((total, item) => total + item.totalPrice, 0);
  this.lastModified = new Date();
  
  // Calculate total price for each item
  this.items.forEach(item => {
    item.totalPrice = item.price * item.quantity;
  });
  
  next();
});

// Instance method to add item to cart
cartSchema.methods.addItem = function(productId, variant, quantity, price) {
  // Check if item already exists in cart
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString() &&
    item.variant.sku === variant.sku
  );
  
  if (existingItemIndex > -1) {
    // Update existing item quantity
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].totalPrice = 
      this.items[existingItemIndex].price * this.items[existingItemIndex].quantity;
  } else {
    // Add new item
    this.items.push({
      product: productId,
      variant,
      quantity,
      price,
      totalPrice: price * quantity
    });
  }
  
  return this.save();
};

// Instance method to update item quantity
cartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  if (quantity <= 0) {
    item.remove();
  } else {
    item.quantity = quantity;
    item.totalPrice = item.price * quantity;
  }
  
  return this.save();
};

// Instance method to remove item from cart
cartSchema.methods.removeItem = function(itemId) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  item.remove();
  return this.save();
};

// Instance method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

// Static method to get or create cart for user
cartSchema.statics.getOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId }).populate('items.product');
  
  if (!cart) {
    cart = new this({ user: userId, items: [] });
    await cart.save();
  }
  
  return cart;
};

module.exports = mongoose.model('Cart', cartSchema);