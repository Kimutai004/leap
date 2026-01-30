import mongoose from 'mongoose';
import { productRepository, CreateProductDto, UpdateProductDto } from '../repositories/product.repository';
import { IProduct } from '../models/Product';
import logger from '../utils/logger';

export interface PaginatedProducts {
  products: IProduct[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export class ProductService {
  async createProduct(data: CreateProductDto): Promise<IProduct> {
    const product = await productRepository.create(data);
    logger.info(`Product created: ${product.id} - ${product.name}`);
    return product;
  }

  async getProductById(id: string): Promise<IProduct | null> {
    return productRepository.findById(id);
  }

  async getAllProducts(filters?: ProductFilters): Promise<PaginatedProducts> {
    return productRepository.findAll(filters);
  }

  async updateProduct(id: string, data: UpdateProductDto): Promise<IProduct | null> {
    const product = await productRepository.update(id, data);
    if (product) {
      logger.info(`Product updated: ${id}`);
    }
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const deleted = await productRepository.delete(id);
    if (deleted) {
      logger.info(`Product deleted: ${id}`);
    }
    return deleted;
  }

  async getProductsByIds(ids: string[]): Promise<IProduct[]> {
    return productRepository.findByIds(ids);
  }

  async updateProductStock(
    productId: string,
    quantityChange: number,
    session?: mongoose.ClientSession
  ): Promise<IProduct | null> {
    const product = await productRepository.updateStock(
      productId,
      quantityChange,
      session
    );
    
    if (product) {
      logger.debug(`Product ${productId} stock updated by ${quantityChange}, new stock: ${product.stock}`);
    }
    
    return product;
  }
}

export const productService = new ProductService();

