# Order Service API

A production-ready Order Service API built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (admin/customer)
- **Product Management**: CRUD operations for products (admin only for create/update/delete)
- **Order Management**: Create, view, pay, and cancel orders with transactional stock updates
- **Input Validation**: Zod schema validation for all inputs
- **Error Handling**: Centralized error handling with meaningful error responses
- **Logging**: Structured request and event logging with Winston
- **Type Safety**: Full TypeScript implementation

## 📁 Project Structure

```
order-service/
├── src/
│   ├── config/           # Environment configuration & DB connection
│   ├── controllers/      # Route handlers (thin, delegate to services)
│   ├── services/         # Business logic
│   ├── repositories/     # MongoDB operations
│   ├── models/           # Mongoose schemas
│   ├── middleware/       # Auth, validation, error handling
│   ├── routes/           # API route definitions
│   ├── utils/            # Helpers, validators
│   ├── app.ts            # Express application setup
│   └── server.ts         # Server entry point
├── tests/                # Unit & integration tests
├── .env                  # Environment variables
├── docker-compose.yml    # MongoDB container
├── package.json
└── tsconfig.json
```

## 🛠 Prerequisites

- Node.js 18+ 
- MongoDB (local or via Docker)
- npm or yarn

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd order-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up MongoDB**

   Option A - Using Docker:
   ```bash
   docker-compose up -d
   ```

   Option B - Local MongoDB:
   Make sure MongoDB is running on `mongodb://localhost:27017`

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/order-service` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | Token expiration | `24h` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | Login & get JWT | Public |
| GET | `/api/v1/auth/profile` | Get current user profile | Required |

### Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/products` | List all products | Public |
| GET | `/api/v1/products/:id` | Get product by ID | Public |
| POST | `/api/v1/products` | Create product | Admin |
| PATCH | `/api/v1/products/:id` | Update product | Admin |
| DELETE | `/api/v1/products/:id` | Delete product | Admin |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/orders` | Create order | Customer |
| GET | `/api/v1/orders` | List user's orders | Customer |
| GET | `/api/v1/orders/:id` | Get order by ID | Customer |
| POST | `/api/v1/orders/:id/pay` | Pay for order | Customer |
| POST | `/api/v1/orders/:id/cancel` | Cancel order | Customer |

## 📝 Example curl Requests

### 1. Register a new user

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@example.com", "password": "securePassword123", "role": "customer"}'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@example.com", "password": "securePassword123"}'
```

Response includes JWT token:
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Create a product (Admin only)

```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{"name": "Laptop", "price": 99999, "stock": 10}'
```

### 4. List products

```bash
curl http://localhost:3000/api/v1/products
```

### 5. Create an order

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{"items": [{"productId": "PRODUCT_ID", "quantity": 2}]}'
```

### 6. Pay for an order

```bash
curl -X POST http://localhost:3000/api/v1/orders/ORDER_ID/pay \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### 7. Cancel an order

```bash
curl -X POST http://localhost:3000/api/v1/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests in watch mode
```bash
npm run test:watch
```

## 📄 API Documentation

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {...}
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "stack": "..." // only in development
  }
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

## 🔐 Security Considerations

- Passwords are hashed using bcrypt with 12 salt rounds
- JWT tokens expire after 24 hours (configurable)
- Helmet middleware adds security headers
- CORS is enabled (configure for production)
- Input validation on all endpoints

## 🚧 Edge Cases Handled

- ✅ Duplicate email registration
- ✅ Invalid/expired JWT tokens
- ✅ Order with non-existent products
- ✅ Insufficient stock
- ✅ Idempotent payment (double-pay protection)
- ✅ Order status conflicts (paid/cancelled)


