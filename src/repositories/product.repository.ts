import mongoose from 'mongoose';
import { IProduct, Product } from '../models/Product';
import logger from '../utils/logger';

export interface CreateProductDto {
  name: string;
  price: number;
  stock: number;
}

export interface UpdateProductDto {
  name?: string;
  price?: number;
  stock?: number;
}

export interface ProductRepository {
  create(data: CreateProductDto): Promise<IProduct>;
  findById(id: string): Promise<IProduct | null>;
  findAll(options?: {
    page?: number;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }): Promise<{
    products: IProduct[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  findByIds(ids: string[]): Promise<IProduct[]>;
  update(id: string, data: UpdateProductDto): Promise<IProduct | null>;
  delete(id: string): Promise<boolean>;
  updateStock(
    productId: string,
    quantityChange: number,
    session?: mongoose.ClientSession
  ): Promise<IProduct | null>;
}

class ProductRepositoryImpl implements ProductRepository {
  async create(data: CreateProductDto): Promise<IProduct> {
    const product = new Product(data);
    await product.save();
    logger.debug(`Product created: ${product.id}`);
    return product;
  }

  async findById(id: string): Promise<IProduct | null> {
    return Product.findById(id).exec();
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }): Promise<{
    products: IProduct[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (options?.minPrice !== undefined) {
      query.price = { ...query.price, $gte: options.minPrice };
    }
    if (options?.maxPrice !== undefined) {
      query.price = { ...query.price, $lte: options.maxPrice };
    }
    if (options?.inStock !== undefined) {
      query.stock = options.inStock ? { $gt: 0 } : { $eq: 0 };
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).skip(skip).limit(limit).exec(),
      Product.countDocuments(query).exec()
    ]);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findByIds(ids: string[]): Promise<IProduct[]> {
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    return Product.find({ _id: { $in: objectIds } }).exec();
  }

  async update(id: string, data: UpdateProductDto): Promise<IProduct | null> {
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).exec();
    
    if (product) {
      logger.debug(`Product updated: ${id}`);
    }
    
    return product;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Product.findByIdAndDelete(id).exec();
    if (result) {
      logger.debug(`Product deleted: ${id}`);
    }
    return !!result;
  }

  async updateStock(
    productId: string,
    quantityChange: number,
    session?: mongoose.ClientSession
  ): Promise<IProduct | null> {
    const product = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantityChange } },
      { new: true, session, runValidators: true }
    ).exec();
    
    return product;
  }
}

export const productRepository = new ProductRepositoryImpl();

