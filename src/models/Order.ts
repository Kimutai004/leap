import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 'created' | 'paid' | 'cancelled';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number; // price in cents at time of purchase
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  total: number; // in cents
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (this: IOrder, items: IOrderItem[]) {
          return items.length > 0;
        },
        message: 'Order must contain at least one item'
      }
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'cancelled'],
      default: 'created',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user + status queries
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);

