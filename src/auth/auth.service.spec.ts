import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  compare: jest.fn(() => Promise.resolve(true)),
  hash: jest.fn(() => Promise.resolve('hashed')),
}));

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _usersService: jest.Mocked<UsersService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _jwtService: jest.Mocked<JwtService>;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _usersService = module.get(UsersService);
    _jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return OTP', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: false,
        otp: '123456',
        otpExpiry: new Date(),
        createdAt: new Date(),
      });

      const result = await service.register(
        'test@example.com',
        'password123',
        Role.STUDENT,
      );

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('registered');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: true,
        otp: null,
        otpExpiry: null,
        createdAt: new Date(),
      });

      await expect(
        service.register('test@example.com', 'password123', Role.STUDENT),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: false,
        otp: '123456',
        otpExpiry: futureDate,
        createdAt: new Date(),
      });
      mockUsersService.update.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: true,
        otp: null,
        otpExpiry: null,
        createdAt: new Date(),
      });

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('verified');
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: false,
        otp: '123456',
        otpExpiry: futureDate,
        createdAt: new Date(),
      });

      await expect(
        service.verifyOtp('test@example.com', 'wrongotp'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: false,
        otp: '123456',
        otpExpiry: pastDate,
        createdAt: new Date(),
      });

      await expect(
        service.verifyOtp('test@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.verifyOtp('notfound@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return message if email already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: true,
        otp: null,
        otpExpiry: null,
        createdAt: new Date(),
      });

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('already verified');
    });
  });

  describe('login', () => {
    it('should login successfully and return JWT token', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        role: Role.STUDENT,
        isVerified: true,
        otp: null,
        otpExpiry: null,
        createdAt: new Date(),
      });
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('jwt-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('notfound@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: Role.STUDENT,
        isVerified: false,
        otp: null,
        otpExpiry: null,
        createdAt: new Date(),
      });

      await expect(
        service.login('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const bcrypt = require('bcrypt');
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        role: Role.STUDENT,
        isVerified: true,
        otp: null,
        otpExpiry: null,
        createdAt: new Date(),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
