import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../utils/validators';
import { createProductSchema, updateProductSchema, productFiltersSchema } from '../utils/validators';

const router = Router();

// Public routes
router.get('/', validate(productFiltersSchema), productController.getProducts);
router.get('/:id', productController.getProduct);

// Admin only routes
router.post('/', 
  authenticate, 
  authorize('admin'), 
  validate(createProductSchema), 
  productController.createProduct
);

router.patch('/:id', 
  authenticate, 
  authorize('admin'), 
  validate(updateProductSchema), 
  productController.updateProduct
);

router.delete('/:id', 
  authenticate, 
  authorize('admin'), 
  productController.deleteProduct
);

export default router;

