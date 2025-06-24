# Clothing Store Backend API

A comprehensive Express.js backend API for a modern e-commerce clothing store with full features including user authentication, product management, cart functionality, order processing, and admin panel.

## 🚀 Features

- **User Authentication & Authorization**: JWT-based auth with role-based access control
- **Product Management**: Complete CRUD operations with variants, inventory tracking, and reviews
- **Shopping Cart**: Persistent cart with real-time inventory validation
- **Order Processing**: Full order lifecycle from creation to delivery tracking
- **Category Management**: Hierarchical category structure with parent-child relationships
- **User Profiles**: Customer profiles with multiple addresses and preferences
- **Admin Dashboard**: Comprehensive admin features for managing users, products, and orders
- **Search & Filtering**: Advanced product search with multiple filter options
- **Review System**: Product reviews and ratings with verification
- **Analytics**: Order analytics and user statistics

## 🛠️ Technologies Used

**Backend:**
- Node.js (Runtime Environment)
- Express.js (Web Framework)
- MongoDB (Database)
- Mongoose (ODM)
- JWT (Authentication)
- bcryptjs (Password Hashing)

**Security & Validation:**
- Helmet (Security Headers)
- Express Rate Limit (Rate Limiting)
- Express Validator (Input Validation)
- CORS (Cross-Origin Resource Sharing)

**Development & Utilities:**
- Nodemon (Development Server)
- Morgan (HTTP Logging)
- Compression (Response Compression)
- Multer (File Upload)
- Cloudinary (Image Storage)
- Stripe (Payment Processing)

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (local installation or MongoDB Atlas)

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/clothing-store-backend.git
   cd clothing-store-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration values:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/clothing-store
   JWT_SECRET=your_super_secret_jwt_key
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB:**
   Make sure MongoDB is running on your system or set up MongoDB Atlas

5. **Seed the database with sample data:**
   ```bash
   npm run seed
   ```

## 🚀 Usage

### Development Mode

Start the development server with auto-reload:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Production Mode

Start the production server:

```bash
npm start
```

### Health Check

Visit `http://localhost:5000/health` to verify the API is running

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### API Endpoints

#### Authentication Routes (`/api/auth`)
- `POST /register` - Register a new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get current user profile
- `PUT /me` - Update user profile
- `POST /change-password` - Change password
- `POST /forgot-password` - Request password reset
- `POST /reset-password/:token` - Reset password
- `POST /refresh-token` - Refresh JWT token

#### Product Routes (`/api/products`)
- `GET /` - Get all products (with filtering and pagination)
- `GET /search` - Search products
- `GET /featured` - Get featured products
- `GET /:id` - Get single product
- `POST /` - Create product (Admin only)
- `PUT /:id` - Update product (Admin only)
- `DELETE /:id` - Delete product (Admin only)
- `POST /:id/reviews` - Add product review
- `PUT /:id/reviews/:reviewId` - Update review
- `DELETE /:id/reviews/:reviewId` - Delete review

#### Category Routes (`/api/categories`)
- `GET /` - Get all categories
- `GET /tree` - Get category tree structure
- `GET /:id` - Get single category
- `GET /:id/products` - Get products in category
- `POST /` - Create category (Admin only)
- `PUT /:id` - Update category (Admin only)
- `DELETE /:id` - Delete category (Admin only)

#### Cart Routes (`/api/cart`)
- `GET /` - Get user's cart
- `POST /items` - Add item to cart
- `PUT /items/:itemId` - Update cart item quantity
- `DELETE /items/:itemId` - Remove item from cart
- `DELETE /` - Clear entire cart
- `GET /summary` - Get cart summary

#### Order Routes (`/api/orders`)
- `GET /` - Get user's orders (or all orders for admin)
- `GET /:id` - Get single order
- `POST /` - Create new order
- `PUT /:id/status` - Update order status (Admin only)
- `PUT /:id/shipping` - Update shipping info (Admin only)
- `POST /:id/cancel` - Cancel order
- `GET /analytics/summary` - Get order analytics (Admin only)
- `GET /:id/invoice` - Get order invoice

#### User Routes (`/api/users`)
- `GET /` - Get all users (Admin only)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Deactivate user (Admin only)
- `POST /:id/addresses` - Add user address
- `PUT /:id/addresses/:addressId` - Update user address
- `DELETE /:id/addresses/:addressId` - Delete user address
- `GET /:id/orders` - Get user's orders
- `GET /:id/stats` - Get user statistics

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/clothing-store

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=7d

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe Configuration (for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration (using Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Admin Configuration
ADMIN_EMAIL=admin@clothingstore.com
ADMIN_PASSWORD=admin123
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## 🏗️ Development

### Project Structure

```
clothing-store-backend/
├── models/               # Mongoose models
│   ├── User.js          # User model
│   ├── Product.js       # Product model
│   ├── Category.js      # Category model
│   ├── Cart.js          # Cart model
│   └── Order.js         # Order model
├── routes/               # API routes
│   ├── auth.js          # Authentication routes
│   ├── products.js      # Product routes
│   ├── categories.js    # Category routes
│   ├── cart.js          # Cart routes
│   ├── orders.js        # Order routes
│   └── users.js         # User management routes
├── middleware/           # Custom middleware
│   ├── auth.js          # Authentication middleware
│   ├── errorHandler.js  # Error handling middleware
│   └── validation.js    # Input validation middleware
├── scripts/              # Utility scripts
│   └── seedDatabase.js  # Database seeding script
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore file
├── package.json        # Dependencies and scripts
├── server.js           # Main server file
└── README.md           # Project documentation
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data
- `npm test` - Run tests

### Code Style

This project follows:
- RESTful API design principles
- Clean code practices
- Proper error handling
- Input validation and sanitization
- Security best practices

## 🚀 Deployment

### Heroku (Recommended)

1. Create a Heroku app:
   ```bash
   heroku create your-app-name
   ```

2. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set MONGODB_URI=your_mongodb_atlas_uri
   ```

3. Deploy:
   ```bash
   git push heroku main
   ```

### Docker

```bash
# Build the image
docker build -t clothing-store-api .

# Run the container
docker run -p 5000:5000 --env-file .env clothing-store-api
```

### AWS/DigitalOcean

1. Set up a server instance
2. Install Node.js and MongoDB
3. Clone the repository
4. Install dependencies and set environment variables
5. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "clothing-store-api"
   ```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

### Development Guidelines

- Follow RESTful API conventions
- Write clean, readable code
- Add proper error handling
- Include input validation
- Add tests for new features
- Update documentation as needed
- Use meaningful commit messages

## 📋 Sample Data

After running `npm run seed`, you can use these test accounts:

**Admin Account:**
- Email: `admin@clothingstore.com`
- Password: `admin123`

**Customer Account:**
- Email: `john.doe@example.com`
- Password: `password123`

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS protection
- Security headers with Helmet
- Role-based access control

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [API Documentation](http://localhost:5000/health)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)

## 👏 Acknowledgments

- Express.js for the web framework
- MongoDB for the database
- Mongoose for elegant MongoDB object modeling
- JWT for secure authentication
- bcryptjs for password hashing

## 📞 Support

For support or questions about this project, please open an issue on GitHub.

---

**Made with ❤️ for modern e-commerce**
