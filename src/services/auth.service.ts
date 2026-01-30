import jwt from 'jsonwebtoken';
import type { Secret } from 'jsonwebtoken';
import config from '../config';
import { userRepository } from '../repositories/user.repository';
import { IUser } from '../models/User';
import logger from '../utils/logger';

export interface RegisterDto {
  email: string;
  password: string;
  role?: 'admin' | 'customer';
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<IUser, 'passwordHash'>;
  token: string;
}

export class AuthService {
  async register(data: RegisterDto): Promise<AuthResult> {
    const { email, password, role = 'customer' } = data;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user with hashed password
    const user = await userRepository.create({
      email,
      passwordHash: password,
      role
    });

    // Generate JWT
    const token = this.generateToken(user);

    logger.info(`User registered: ${user.id} with role: ${user.role}`);

    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  async login(data: LoginDto): Promise<AuthResult> {
    const { email, password } = data;

    // Find user by email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT
    const token = this.generateToken(user);

    logger.info(`User logged in: ${user.id}`);

    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  async getUserById(id: string): Promise<IUser | null> {
    return userRepository.findById(id);
  }

  private generateToken(user: IUser): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, config.jwtSecret as Secret, { expiresIn: config.jwtExpiresIn || '1d' });
  }

  private sanitizeUser(user: IUser): Omit<IUser, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = user.toObject();
    return sanitizedUser;
  }
}

export const authService = new AuthService();

