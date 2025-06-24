const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Sample data
const sampleCategories = [
  {
    name: 'Men\'s Clothing',
    description: 'Clothing and accessories for men',
    sortOrder: 1
  },
  {
    name: 'Women\'s Clothing',
    description: 'Clothing and accessories for women',
    sortOrder: 2
  },
  {
    name: 'Shirts',
    description: 'Various types of shirts',
    sortOrder: 1
  },
  {
    name: 'Pants',
    description: 'Trousers, jeans, and other pants',
    sortOrder: 2
  },
  {
    name: 'Dresses',
    description: 'Women\'s dresses for all occasions',
    sortOrder: 3
  },
  {
    name: 'Accessories',
    description: 'Bags, belts, jewelry and other accessories',
    sortOrder: 4
  }
];

const sampleProducts = [
  {
    name: 'Classic White T-Shirt',
    description: 'A comfortable, classic white t-shirt made from 100% cotton. Perfect for everyday wear or layering.',
    shortDescription: 'Classic white cotton t-shirt',
    sku: 'TSH-WHT-001',
    brand: 'ComfortWear',
    price: 24.99,
    comparePrice: 29.99,
    images: [
      {
        url: 'https://via.placeholder.com/400x400/ffffff/000000?text=White+T-Shirt',
        alt: 'Classic White T-Shirt',
        isPrimary: true
      }
    ],
    variants: [
      {
        color: 'White',
        colorCode: '#FFFFFF',
        size: 'S',
        sku: 'TSH-WHT-001-S',
        inventory: { quantity: 50, threshold: 5 }
      },
      {
        color: 'White',
        colorCode: '#FFFFFF',
        size: 'M',
        sku: 'TSH-WHT-001-M',
        inventory: { quantity: 75, threshold: 5 }
      },
      {
        color: 'White',
        colorCode: '#FFFFFF',
        size: 'L',
        sku: 'TSH-WHT-001-L',
        inventory: { quantity: 60, threshold: 5 }
      },
      {
        color: 'White',
        colorCode: '#FFFFFF',
        size: 'XL',
        sku: 'TSH-WHT-001-XL',
        inventory: { quantity: 40, threshold: 5 }
      }
    ],
    material: '100% Cotton',
    careInstructions: ['Machine wash cold', 'Tumble dry low', 'Do not bleach'],
    features: ['Soft cotton fabric', 'Classic fit', 'Reinforced seams'],
    tags: ['basic', 'casual', 'cotton', 'comfortable'],
    isFeatured: true
  },
  {
    name: 'Slim Fit Jeans',
    description: 'Modern slim fit jeans with stretch denim for comfort and style. Perfect for casual and semi-formal occasions.',
    shortDescription: 'Comfortable slim fit stretch jeans',
    sku: 'JNS-BLU-002',
    brand: 'DenimCraft',
    price: 79.99,
    comparePrice: 99.99,
    images: [
      {
        url: 'https://via.placeholder.com/400x400/000080/ffffff?text=Blue+Jeans',
        alt: 'Slim Fit Blue Jeans',
        isPrimary: true
      }
    ],
    variants: [
      {
        color: 'Dark Blue',
        colorCode: '#1e3a8a',
        size: 'S',
        sku: 'JNS-BLU-002-S',
        inventory: { quantity: 30, threshold: 5 }
      },
      {
        color: 'Dark Blue',
        colorCode: '#1e3a8a',
        size: 'M',
        sku: 'JNS-BLU-002-M',
        inventory: { quantity: 45, threshold: 5 }
      },
      {
        color: 'Dark Blue',
        colorCode: '#1e3a8a',
        size: 'L',
        sku: 'JNS-BLU-002-L',
        inventory: { quantity: 35, threshold: 5 }
      },
      {
        color: 'Dark Blue',
        colorCode: '#1e3a8a',
        size: 'XL',
        sku: 'JNS-BLU-002-XL',
        inventory: { quantity: 25, threshold: 5 }
      }
    ],
    material: '98% Cotton, 2% Elastane',
    careInstructions: ['Machine wash cold', 'Hang dry recommended', 'Iron on medium heat'],
    features: ['Stretch denim', 'Slim fit', 'Five-pocket design', 'Button fly'],
    tags: ['jeans', 'denim', 'slim-fit', 'stretch'],
    isFeatured: true
  },
  {
    name: 'Elegant Summer Dress',
    description: 'A beautiful, flowing summer dress perfect for warm weather. Features a flattering fit and breathable fabric.',
    shortDescription: 'Flowing summer dress in floral print',
    sku: 'DRS-FLR-003',
    brand: 'SummerStyle',
    price: 89.99,
    images: [
      {
        url: 'https://via.placeholder.com/400x400/ffb3ba/000000?text=Summer+Dress',
        alt: 'Elegant Summer Dress',
        isPrimary: true
      }
    ],
    variants: [
      {
        color: 'Floral Print',
        colorCode: '#ffb3ba',
        size: 'S',
        sku: 'DRS-FLR-003-S',
        inventory: { quantity: 20, threshold: 3 }
      },
      {
        color: 'Floral Print',
        colorCode: '#ffb3ba',
        size: 'M',
        sku: 'DRS-FLR-003-M',
        inventory: { quantity: 25, threshold: 3 }
      },
      {
        color: 'Floral Print',
        colorCode: '#ffb3ba',
        size: 'L',
        sku: 'DRS-FLR-003-L',
        inventory: { quantity: 18, threshold: 3 }
      }
    ],
    material: '100% Rayon',
    careInstructions: ['Hand wash cold', 'Hang dry', 'Do not bleach'],
    features: ['Breathable fabric', 'Flowing silhouette', 'Adjustable straps'],
    tags: ['dress', 'summer', 'floral', 'elegant'],
    isFeatured: false
  },
  {
    name: 'Leather Crossbody Bag',
    description: 'Stylish and practical leather crossbody bag perfect for everyday use. Features multiple compartments for organization.',
    shortDescription: 'Genuine leather crossbody bag',
    sku: 'BAG-LTH-004',
    brand: 'LeatherLux',
    price: 149.99,
    comparePrice: 189.99,
    images: [
      {
        url: 'https://via.placeholder.com/400x400/8B4513/ffffff?text=Leather+Bag',
        alt: 'Leather Crossbody Bag',
        isPrimary: true
      }
    ],
    variants: [
      {
        color: 'Brown',
        colorCode: '#8B4513',
        size: 'One Size',
        sku: 'BAG-LTH-004-OS',
        inventory: { quantity: 15, threshold: 2 }
      },
      {
        color: 'Black',
        colorCode: '#000000',
        size: 'One Size',
        sku: 'BAG-BLK-004-OS',
        inventory: { quantity: 12, threshold: 2 }
      }
    ],
    material: 'Genuine Leather',
    careInstructions: ['Clean with leather cleaner', 'Condition regularly', 'Store in dust bag'],
    features: ['Genuine leather', 'Adjustable strap', 'Multiple compartments', 'Magnetic closure'],
    tags: ['bag', 'leather', 'crossbody', 'accessories'],
    isFeatured: true
  }
];

const sampleUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@clothingstore.com',
    password: 'admin123',
    role: 'admin',
    isEmailVerified: true
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'customer',
    phoneNumber: '+1234567890',
    isEmailVerified: true,
    addresses: [
      {
        type: 'shipping',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'United States',
        isDefault: true
      }
    ]
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    role: 'customer',
    phoneNumber: '+1987654321',
    isEmailVerified: true,
    addresses: [
      {
        type: 'shipping',
        street: '456 Oak Ave',
        city: 'Another City',
        state: 'NY',
        zipCode: '10001',
        country: 'United States',
        isDefault: true
      }
    ]
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clothing-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});

    // Create categories
    console.log('📁 Creating categories...');
    const createdCategories = await Category.insertMany(sampleCategories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Set up category relationships
    const mensCategory = createdCategories.find(cat => cat.name === 'Men\'s Clothing');
    const womensCategory = createdCategories.find(cat => cat.name === 'Women\'s Clothing');
    const shirtsCategory = createdCategories.find(cat => cat.name === 'Shirts');
    const pantsCategory = createdCategories.find(cat => cat.name === 'Pants');
    const dressesCategory = createdCategories.find(cat => cat.name === 'Dresses');
    const accessoriesCategory = createdCategories.find(cat => cat.name === 'Accessories');

    // Set parent-child relationships
    shirtsCategory.parentCategory = mensCategory._id;
    pantsCategory.parentCategory = mensCategory._id;
    dressesCategory.parentCategory = womensCategory._id;

    await shirtsCategory.save();
    await pantsCategory.save();
    await dressesCategory.save();

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create products with category references
    console.log('🛍️ Creating products...');
    sampleProducts[0].category = shirtsCategory._id; // T-shirt -> Shirts
    sampleProducts[1].category = pantsCategory._id;  // Jeans -> Pants
    sampleProducts[2].category = dressesCategory._id; // Dress -> Dresses
    sampleProducts[3].category = accessoriesCategory._id; // Bag -> Accessories

    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`✅ Created ${createdProducts.length} products`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${createdCategories.length} categories created`);
    console.log(`   • ${createdUsers.length} users created`);
    console.log(`   • ${createdProducts.length} products created`);
    console.log('\n🔐 Admin Login:');
    console.log('   Email: admin@clothingstore.com');
    console.log('   Password: admin123');
    console.log('\n👤 Customer Login:');
    console.log('   Email: john.doe@example.com');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
}

// Run the seeding function if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;