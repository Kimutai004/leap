import { IUser } from '../models/User';
import { User } from '../models/User';
import logger from '../utils/logger';

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  role?: 'admin' | 'customer';
}

export interface UserRepository {
  create(data: CreateUserDto): Promise<IUser>;
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  findAll(options?: { role?: string; page?: number; limit?: number }): Promise<{
    users: IUser[];
    total: number;
    page: number;
    totalPages: number;
  }>;
}

class UserRepositoryImpl implements UserRepository {
  async create(data: CreateUserDto): Promise<IUser> {
    try {
      const user = new User(data);
      await user.save();
      logger.debug(`User created: ${user.id}`);
      return user;
    } catch (error) {
      if ((error as any).code === 11000) {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).exec();
  }

  async findAll(options?: { role?: string; page?: number; limit?: number }): Promise<{
    users: IUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};
    
    if (options?.role) {
      query.role = options.role;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query).select('-passwordHash').skip(skip).limit(limit).exec(),
      User.countDocuments(query).exec()
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

export const userRepository = new UserRepositoryImpl();

