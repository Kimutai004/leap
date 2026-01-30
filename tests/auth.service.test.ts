import { authService } from '../src/services/auth.service';
import { userRepository } from '../src/repositories/user.repository';
import { IUser } from '../src/models/User';
import mongoose from 'mongoose';

// Mock the userRepository
jest.mock('../src/repositories/user.repository');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        role: 'customer',
        createdAt: new Date(),
        toObject: function() { return { id: this.id, email: this.email, role: this.role, createdAt: this.createdAt }; }
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        role: 'customer'
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('customer');
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'customer'
      });
    });

    it('should throw error if email already exists', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        email: 'test@example.com'
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123'
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should default role to customer if not provided', async () => {
      const mockUser = {
        id: new mongoose.Types.ObjectId().toString(),
        email: 'customer@example.com',
        passwordHash: 'hashedPassword',
        role: 'customer',
        createdAt: new Date(),
        toObject: function() { return { id: this.id, email: this.email, role: this.role, createdAt: this.createdAt }; }
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'customer@example.com',
        password: 'password123'
      });

      expect(result.user.role).toBe('customer');
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        passwordHash: '$2a$12$hashedPassword', // pre-hashed
        role: 'customer',
        createdAt: new Date(),
        comparePassword: jest.fn().mockResolvedValue(true),
        toObject: function() { return { id: this.id, email: this.email, role: this.role, createdAt: this.createdAt }; }
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
    });

    it('should throw error with invalid email', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error with invalid password', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashedPassword',
        role: 'customer',
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        role: 'customer',
        createdAt: new Date()
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return null for non-existent user', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await authService.getUserById('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});

