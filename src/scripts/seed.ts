import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Import models
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/order-service';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      email: 'admin@orderservice.com',
      passwordHash: adminPasswordHash,
      role: 'admin'
    });
    console.log(`Created admin user: ${admin.email}`);

    // Create customer users
    const customerPasswordHash = await bcrypt.hash('customer123', 12);
    const customer1 = await User.create({
      email: 'customer1@orderservice.com',
      passwordHash: customerPasswordHash,
      role: 'customer'
    });
    const customer2 = await User.create({
      email: 'customer2@orderservice.com',
      passwordHash: customerPasswordHash,
      role: 'customer'
    });
    console.log(`Created customer users: ${customer1.email}, ${customer2.email}`);

    // Create products
    const products = await Product.insertMany([
      { name: 'Laptop', price: 99999, stock: 50 },
      { name: 'Smartphone', price: 59999, stock: 100 },
      { name: 'Headphones', price: 14999, stock: 200 },
      { name: 'Tablet', price: 44999, stock: 75 },
      { name: 'Smartwatch', price: 24999, stock: 150 }
    ]);
    console.log(`Created ${products.length} products`);

    // Create sample orders
    const laptop = products[0];
    const headphones = products[2];

    await Order.create({
      userId: customer1._id,
      items: [
        ...(laptop && typeof laptop._id !== 'undefined' && typeof laptop.price !== 'undefined' ? [{ productId: laptop._id, quantity: 1, unitPrice: laptop.price }] : []),
        ...(headphones && typeof headphones._id !== 'undefined' && typeof headphones.price !== 'undefined' ? [{ productId: headphones._id, quantity: 2, unitPrice: headphones.price }] : [])
      ],
      total: ((laptop && typeof laptop.price !== 'undefined' ? laptop.price : 0) + (2 * (headphones && typeof headphones.price !== 'undefined' ? headphones.price : 0))),
      status: 'paid'
    });
    console.log('Created sample orders');

    console.log('\n✅ Seed completed successfully!\n');
    console.log('Test Credentials:');
    console.log('----------------');
    console.log('Admin: admin@orderservice.com / admin123');
    console.log('Customer: customer1@orderservice.com / customer123');
    console.log('');
    console.log('Products created with IDs for testing:');
    products.forEach(p => console.log(`  - ${p.name}: ${p.id}`));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();

