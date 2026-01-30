import { orderService } from '../src/services/order.service';
import { orderRepository } from '../src/repositories/order.repository';
import { productService } from '../src/services/product.service';
import mongoose from 'mongoose';

// Mock the repositories
jest.mock('../src/repositories/order.repository');
jest.mock('../src/services/product.service');

describe('OrderService', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockProductId = new mongoose.Types.ObjectId().toString();
  const mockOrderId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create order successfully with sufficient stock', async () => {
      const mockProduct = {
        id: mockProductId,
        name: 'Test Product',
        price: 1000,
        stock: 10
      };

      const mockOrder = {
        id: mockOrderId,
        userId: new mongoose.Types.ObjectId(mockUserId),
        items: [{
          productId: new mongoose.Types.ObjectId(mockProductId),
          quantity: 2,
          unitPrice: 1000
        }],
        total: 2000,
        status: 'created'
      };

      (productService.getProductsByIds as jest.Mock).mockResolvedValue([mockProduct]);
      (orderRepository.create as jest.Mock).mockResolvedValue(mockOrder);
      (productService.updateProductStock as jest.Mock).mockResolvedValue(mockProduct);
      (orderRepository.withTransaction as jest.Mock).mockImplementation(async (callback) => {
        const mockSession = {};
        return callback(mockSession as any);
      });

      const result = await orderService.createOrder(mockUserId, [
        { productId: mockProductId, quantity: 2 }
      ]);

      expect(result.order).toBeDefined();
      expect(result.order.total).toBe(2000);
      expect(result.message).toBe('Order created successfully');
    });

    it('should throw error when order has no items', async () => {
      await expect(
        orderService.createOrder(mockUserId, [])
      ).rejects.toThrow('Order must contain at least one item');
    });

    it('should throw error when quantity is <= 0', async () => {
      await expect(
        orderService.createOrder(mockUserId, [
          { productId: mockProductId, quantity: 0 }
        ])
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    it('should throw error when product not found', async () => {
      (productService.getProductsByIds as jest.Mock).mockResolvedValue([]);

      await expect(
        orderService.createOrder(mockUserId, [
          { productId: mockProductId, quantity: 1 }
        ])
      ).rejects.toThrow('Products not found');
    });

    it('should throw error when insufficient stock', async () => {
      const mockProduct = {
        id: mockProductId,
        name: 'Test Product',
        price: 1000,
        stock: 5
      };

      (productService.getProductsByIds as jest.Mock).mockResolvedValue([mockProduct]);

      await expect(
        orderService.createOrder(mockUserId, [
          { productId: mockProductId, quantity: 10 }
        ])
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('getOrderById', () => {
    it('should return order for authorized user', async () => {
      const mockOrder = {
        id: mockOrderId,
        userId: new mongoose.Types.ObjectId(mockUserId),
        items: [],
        total: 1000,
        status: 'created'
      };

      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById(mockOrderId, mockUserId, false);

      expect(result).toEqual(mockOrder);
    });

    it('should throw error for unauthorized access', async () => {
      const mockOrder = {
        id: mockOrderId,
        userId: new mongoose.Types.ObjectId(mockUserId),
        items: [],
        total: 1000,
        status: 'created'
      };

      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        orderService.getOrderById(mockOrderId, 'different-user-id', false)
      ).rejects.toThrow('Access denied');
    });

    it('should return null for non-existent order', async () => {
      (orderRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await orderService.getOrderById('nonexistent-id', mockUserId, false);

      expect(result).toBeNull();
    });
  });

  describe('payOrder', () => {
    it('should pay order successfully', async () => {
      const mockOrder = {
        id: mockOrderId,
        userId: new mongoose.Types.ObjectId(mockUserId),
        items: [],
        total: 1000,
        status: 'created'
      };

      const paidOrder = { ...mockOrder, status: 'paid' };

      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);
      (orderRepository.updateStatus as jest.Mock).mockResolvedValue(paidOrder);

      const result = await orderService.payOrder(mockOrderId, mockUserId, false);

      expect(result.order.status).toBe('paid');
      expect(result.message).toBe('Payment successful');
    });

    it('should return success for already paid order (idempotent)', async () => {
      const paidOrder = {
        id: mockOrderId,
        userId: new mongoose.Types.ObjectId(mockUserId),
        items: [],
        total: 1000,
        status: 'paid'
      };

      (orderRepository.findById as jest.Mock).mockResolvedValue(paidOrder);

      const result = await orderService.payOrder(mockOrderId, mockUserId, false);

      expect(result.order.status).toBe('paid');
      expect(result.message).toBe('Order is already paid');
    });

    it('should throw error for cancelled order', async () => {
      const cancelledOrder = {
        id: mockOrderId,
        userId: new mongoose.Types.ObjectId(mockUserId),
        items: [],
        total: 1000,
        status: 'cancelled'
      };

      (orderRepository.findById as jest.Mock).mockResolvedValue(cancelledOrder);

      await expect(
        orderService.payOrder(mockOrderId, mockUserId, false)
      ).rejects.toThrow('Cannot pay for a cancelled order');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and restore stock', async () => {
      const mockOrder = {
        id: mockOrderId,
        userId: new mongoose.Types.ObjectId(mockUserId),
        items: [{
          productId: new mongoose.Types.ObjectId(mockProductId),
          quantity: 2,
          unitPrice: 1000
        }],
        total: 2000,
        status: 'created'
      };

      const cancelledOrder = { ...mockOrder, status: 'cancelled' };
      const mockProduct = { id: mockProductId, stock: 8 };

      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);
      (orderRepository.updateStatus as jest.Mock).mockResolvedValue(cancelledOrder);
      (productService.updateProductStock as jest.Mock).mockResolvedValue(mockProduct);
      (orderRepository.withTransaction as jest.Mock).mockImplementation(async (callback) => {
        const mockSession = {};
        return callback(mockSession as any);
      });

      const result = await orderService.cancelOrder(mockOrderId, mockUserId, false);

      expect(result.order.status).toBe('cancelled');
      expect(result.message).toBe('Order cancelled successfully');
    });

    it('should return success for already cancelled order (idempotent)', async () => {
      const cancelledOrder = {
        id: mockOrderId,
        userId: new mongoose.Types.ObjectId(mockUserId),
        items: [],
        total: 1000,
        status: 'cancelled'
      };

      (orderRepository.findById as jest.Mock).mockResolvedValue(cancelledOrder);

      const result = await orderService.cancelOrder(mockOrderId, mockUserId, false);

      expect(result.order.status).toBe('cancelled');
      expect(result.message).toBe('Order is already cancelled');
    });
  });
});

