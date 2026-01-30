import { z } from 'zod';

// Auth validation schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['admin', 'customer']).optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

// Product validation schemas
export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required').max(255),
    price: z.number().positive('Price must be positive'),
    stock: z.number().int().min(0, 'Stock cannot be negative')
  })
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().min(0).optional()
  }),
  params: z.object({
    id: z.string().uuid('Invalid product ID format')
  })
});

// Order validation schemas
export const createOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  quantity: z.number().int().positive('Quantity must be at least 1')
});

export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(createOrderItemSchema)
      .min(1, 'Order must contain at least one item')
  })
});

export const orderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID format')
  })
});

// Query parameter schemas
export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20)
  })
});

export const productFiltersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    inStock: z.coerce.boolean().optional()
  })
});

export const orderFiltersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    status: z.enum(['created', 'paid', 'cancelled']).optional()
  })
});

// Validation helper function
export const validate = (schema: any) => {
  return (req: any, res: any, next: any): void => {
    try {
      const validated = schema.parse(req);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message
        }));
        
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      } else {
        next(error);
      }
    }
  };
};

