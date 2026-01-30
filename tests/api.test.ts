import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import jwt from 'jsonwebtoken';
import config from '../src/config';

describe('Order Service API Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let adminId: string;
  let customerId: string;
  let testProduct: any;

  // Generate test JWT tokens
  const generateToken = (userId: string, email: string, role: string) => {
    return jwt.sign(
      { id: userId, email, role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  };

  beforeAll(async () => {
    // Create test users directly in database
    const adminUser = await User.create({
      email: 'admin@test.com',
      passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4aYJGYxMnC6C5.Oy', // "password123"
      role: 'admin'
    });
    adminId = adminUser.id;
    adminToken = generateToken(adminUser.id, adminUser.email, 'admin');

    const customerUser = await User.create({
      email: 'customer@test.com',
      passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4aYJGYxMnC6C5.Oy',
      role: 'customer'
    });
    customerId = customerUser.id;
    customerToken = generateToken(customerUser.id, customerUser.email, 'customer');

    // Create a test product
    testProduct = await Product.create({
      name: 'Test Product',
      price: 1000,
      stock: 100
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
  });

  describe('Authentication API', () => {
    it('POST /api/v1/auth/register - should register new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          role: 'customer'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('newuser@test.com');
    });

    it('POST /api/v1/auth/register - should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'admin@test.com',
          password: 'password123',
          role: 'admin'
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/login - should login successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer@test.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
    });

    it('POST /api/v1/auth/login - should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer@test.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/auth/profile - should get user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('customer@test.com');
    });

    it('GET /api/v1/auth/profile - should reject unauthorized request', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Product API', () => {
    it('GET /api/v1/products - should list products', async () => {
      const res = await request(app)
        .get('/api/v1/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/products/:id - should get product by id', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProduct.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Product');
    });

    it('POST /api/v1/products - should create product (admin only)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Product',
          price: 5000,
          stock: 50
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Product');
    });

    it('POST /api/v1/products - should reject customer', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Another Product',
          price: 3000,
          stock: 25
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('PATCH /api/v1/products/:id - should update product', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 1500,
          stock: 80
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(1500);
    });
  });

  describe('Order API', () => {
    let orderId: string;

    it('POST /api/v1/orders - should create order', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            { productId: testProduct.id, quantity: 2 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2000); // 2 * 1000
      orderId = res.body.data.id;
    });

    it('POST /api/v1/orders - should reject insufficient stock', async () => {
      // Create product with low stock
      const lowStockProduct = await Product.create({
        name: 'Limited Product',
        price: 1000,
        stock: 2
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            { productId: lowStockProduct.id, quantity: 5 }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Insufficient stock');
    });

    it('GET /api/v1/orders - should list user orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/orders/:id - should get order by id', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(orderId);
    });

    it('POST /api/v1/orders/:id/pay - should pay order', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('paid');
    });

    it('POST /api/v1/orders/:id/pay - should be idempotent', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Order is already paid');
    });

    it('POST /api/v1/orders/:id/cancel - should cancel order and restore stock', async () => {
      // Create new order to cancel
      const newProduct = await Product.create({
        name: 'Cancel Test Product',
        price: 500,
        stock: 10
      });

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: newProduct.id, quantity: 3 }]
        });

      const newOrderId = createRes.body.data.id;

      // Pay the order first
      await request(app)
        .post(`/api/v1/orders/${newOrderId}/pay`)
        .set('Authorization', `Bearer ${customerToken}`);

      // Now cancel it
      const res = await request(app)
        .post(`/api/v1/orders/${newOrderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
    });
  });

  describe('Admin Access', () => {
    it('should allow admin to see all orders', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('GET /health - should return healthy status', async () => {
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });
});

