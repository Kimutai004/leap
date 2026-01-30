import mongoose from 'mongoose';
import { IOrder, Order, OrderStatus } from '../models/Order';
import logger from '../utils/logger';

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderDto {
  userId: string;
  items: CreateOrderItemDto[];
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface OrderRepository {
  create(data: CreateOrderDto, session?: mongoose.ClientSession): Promise<IOrder>;
  findById(id: string): Promise<IOrder | null>;
  findByUserId(
    userId: string,
    options?: { page?: number; limit?: number; status?: OrderStatus }
  ): Promise<{
    orders: IOrder[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  findAll(options?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    userId?: string;
  }): Promise<{
    orders: IOrder[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  updateStatus(
    id: string,
    status: OrderStatus,
    session?: mongoose.ClientSession
  ): Promise<IOrder | null>;
  withTransaction<T>(
    callback: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T>;
}

class OrderRepositoryImpl implements OrderRepository {
  async create(data: CreateOrderDto, session?: mongoose.ClientSession): Promise<IOrder> {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(data.userId),
      items: data.items.map(item => ({
        productId: new mongoose.Types.ObjectId(item.productId),
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      total: data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      status: 'created'
    });

    await order.save({ session });
    logger.debug(`Order created: ${order.id} for user: ${data.userId}`);
    return order;
  }

  async findById(id: string): Promise<IOrder | null> {
    return Order.findById(id)
      .populate('items.productId')
      .populate('userId', '-passwordHash')
      .exec();
  }

  async findByUserId(
    userId: string,
    options?: { page?: number; limit?: number; status?: OrderStatus }
  ): Promise<{
    orders: IOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    
    if (options?.status) {
      query.status = options.status;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.productId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Order.countDocuments(query).exec()
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    userId?: string;
  }): Promise<{
    orders: IOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (options?.status) {
      query.status = options.status;
    }
    if (options?.userId) {
      query.userId = new mongoose.Types.ObjectId(options.userId);
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.productId')
        .populate('userId', '-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Order.countDocuments(query).exec()
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    session?: mongoose.ClientSession
  ): Promise<IOrder | null> {
    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, session, runValidators: true }
    )
      .populate('items.productId')
      .populate('userId', '-passwordHash')
      .exec();

    if (order) {
      logger.debug(`Order ${id} status updated to: ${status}`);
    }

    return order;
  }

  async withTransaction<T>(
    callback: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const orderRepository = new OrderRepositoryImpl();

