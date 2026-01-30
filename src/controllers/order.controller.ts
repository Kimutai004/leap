import { Response, NextFunction } from 'express';
import { orderService, OrderFilters, CreateOrderDto } from '../services/order.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { OrderStatus } from '../models/Order';

export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items } = req.body as CreateOrderDto;

    const result = await orderService.createOrder(req.user!.id, items);

    res.status(201).json({
      success: true,
      data: result.order,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: OrderFilters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as OrderStatus | undefined
    };

    const isAdmin = req.user!.role === 'admin';
    const result = await orderService.getUserOrders(
      req.user!.id,
      filters,
      isAdmin
    );

    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: filters.limit
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const order = await orderService.getOrderById(
      req.params.id ?? '',
      req.user!.id,
      isAdmin
    );

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

export const payOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const result = await orderService.payOrder(
      req.params.id ?? '',
      req.user!.id,
      isAdmin
    );

    res.status(200).json({
      success: true,
      data: result.order,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const result = await orderService.cancelOrder(
      req.params.id ?? '',
      req.user!.id,
      isAdmin
    );

    res.status(200).json({
      success: true,
      data: result.order,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

