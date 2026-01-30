// import mongoose from 'mongoose';
import { orderRepository, CreateOrderItemDto } from '../repositories/order.repository';
import { productService } from './product.service';
import { IOrder, OrderStatus } from '../models/Order';
import { ConflictError, ValidationError, ApiError } from '../middleware/error.middleware';
import logger from '../utils/logger';

export interface CreateOrderDto {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface OrderResult {
  order: IOrder;
  message: string;
}

export class OrderService {
  async createOrder(userId: string, items: CreateOrderDto['items']): Promise<OrderResult> {
    // Validate items
    if (!items || items.length === 0) {
      throw new ValidationError('Order must contain at least one item');
    }

    // Validate quantity
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new ValidationError('Quantity must be greater than 0');
      }
    }

    // Get all products and validate
    const productIds = items.map(item => item.productId);
    const products = await productService.getProductsByIds(productIds);

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id.toString());
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      throw new ValidationError(`Products not found: ${missingIds.join(', ')}`);
    }

    // Create a map for easy lookup
    const productMap = new Map(products.map(p => [p.id.toString(), p]));

    // Validate stock for all items
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      if (product.stock < item.quantity) {
        throw new ValidationError(
          `Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
        );
      }
    }

    // Prepare order items with unit prices
    const orderItems: CreateOrderItemDto[] = items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: productMap.get(item.productId)!.price
    }));

    // Create order with stock deduction in a transaction
    return orderRepository.withTransaction(async (session) => {
      // Create the order
      const order = await orderRepository.create(
        { userId, items: orderItems },
        session
      );

      // Decrease stock for each product
      for (const item of items) {
        await productService.updateProductStock(
          item.productId,
          -item.quantity,
          session
        );
      }

      logger.info(`Order created: ${order.id} for user: ${userId}`);

      return {
        order,
        message: 'Order created successfully'
      };
    });
  }

  async getOrderById(orderId: string, userId?: string, isAdmin?: boolean): Promise<IOrder | null> {
    const order = await orderRepository.findById(orderId);

    if (!order) {
      return null;
    }

    // Check access permissions
    if (!isAdmin && order.userId.toString() !== userId) {
      throw new ApiError('Access denied', 403);
    }

    return order;
  }

  async getUserOrders(
    userId: string,
    filters?: OrderFilters,
    isAdmin?: boolean
  ): Promise<{
    orders: IOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    if (isAdmin) {
      return orderRepository.findAll(filters);
    }
    return orderRepository.findByUserId(userId, filters);
  }

  async payOrder(orderId: string, userId?: string, isAdmin?: boolean): Promise<OrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    // Check access
    if (!isAdmin && order.userId.toString() !== userId) {
      throw new ApiError('Access denied', 403);
    }

    // Idempotent payment handling
    if (order.status === 'paid') {
      return {
        order,
        message: 'Order is already paid'
      };
    }

    if (order.status === 'cancelled') {
      throw new ConflictError('Cannot pay for a cancelled order');
    }

    if (order.status !== 'created') {
      throw new ApiError(`Cannot pay order with status: ${order.status}`, 400);
    }

    // Update status to paid
    const updatedOrder = await orderRepository.updateStatus(orderId, 'paid');

    logger.info(`Order ${orderId} paid by user: ${userId}`);

    return {
      order: updatedOrder!,
      message: 'Payment successful'
    };
  }

  async cancelOrder(orderId: string, userId?: string, isAdmin?: boolean): Promise<OrderResult> {
    const order = await orderRepository.findById(orderId);

    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    // Check access
    if (!isAdmin && order.userId.toString() !== userId) {
      throw new ApiError('Access denied', 403);
    }

    // Idempotent cancellation
    if (order.status === 'cancelled') {
      return {
        order,
        message: 'Order is already cancelled'
      };
    }

    // Decision: Allow cancellation of paid orders (with stock restoration)
    // This is a business decision - could alternatively return 409
    if (order.status === 'paid') {
      logger.warn(`Cancelling already paid order ${orderId} - may need refund handling in production`);
    }

    if (order.status !== 'created' && order.status !== 'paid') {
      throw new ApiError(`Cannot cancel order with status: ${order.status}`, 400);
    }

    // Restore stock in a transaction
    return orderRepository.withTransaction(async (session) => {
      // Update order status
      const updatedOrder = await orderRepository.updateStatus(orderId, 'cancelled', session);

      // Restore stock for each item
      for (const item of order.items) {
        await productService.updateProductStock(
          item.productId.toString(),
          item.quantity,
          session
        );
      }

      logger.info(`Order ${orderId} cancelled by user: ${userId}`);

      return {
        order: updatedOrder!,
        message: 'Order cancelled successfully'
      };
    });
  }
}

export const orderService = new OrderService();

