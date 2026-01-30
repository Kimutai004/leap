import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../utils/validators';
import { createOrderSchema, orderStatusSchema, orderFiltersSchema } from '../utils/validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer routes
router.post('/', validate(createOrderSchema), orderController.createOrder);
router.get('/', validate(orderFiltersSchema), orderController.getOrders);
router.get('/:id', validate(orderStatusSchema), orderController.getOrder);
router.post('/:id/pay', validate(orderStatusSchema), orderController.payOrder);
router.post('/:id/cancel', validate(orderStatusSchema), orderController.cancelOrder);

export default router;

