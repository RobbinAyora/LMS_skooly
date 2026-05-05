import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let res: Partial<Response>;

  const mockAuthService = {
    register: jest.fn(),
    verifyOtp: jest.fn(),
    login: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    res = {
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      mockAuthService.register.mockResolvedValue({
        message: 'User registered. Please verify your email.',
      });

      const result = await controller.register({
        email: 'test@example.com',
        password: 'password123',
        role: Role.STUDENT,
      });

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('registered');
      expect(authService.register).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        Role.STUDENT,
      );
    });

    it('should throw BadRequestException if user already exists', async () => {
      mockAuthService.register.mockRejectedValue(
        new BadRequestException('User already exists'),
      );

      await expect(
        controller.register({
          email: 'test@example.com',
          password: 'password123',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      mockAuthService.verifyOtp.mockResolvedValue({
        message: 'Email verified successfully.',
      });

      const result = await controller.verifyOtp({
        email: 'test@example.com',
        otp: '123456',
      });

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('verified');
      expect(authService.verifyOtp).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
      );
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      mockAuthService.verifyOtp.mockRejectedValue(
        new BadRequestException('Invalid OTP'),
      );

      await expect(
        controller.verifyOtp({
          email: 'test@example.com',
          otp: 'wrongotp',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login successfully and return JWT token', async () => {
      mockAuthService.login.mockResolvedValue({
        access_token: 'jwt-token',
        role: Role.STUDENT,
      });

      const result = await controller.login(
        {
          email: 'test@example.com',
          password: 'password123',
        },
        res as Response,
      );

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('jwt-token');
      expect(authService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        controller.login(
          {
            email: 'notfound@example.com',
            password: 'password123',
          },
          res as Response,
        ),
      ).rejects.toThrow();
    });
  });

  describe('forgotPassword', () => {
    it('should send reset password email', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({
        message: 'If the email exists, a reset link has been sent.',
      });

      const result = await controller.forgotPassword({
        email: 'test@example.com',
      });

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('reset link');
      expect(authService.forgotPassword).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      });

      const result = await controller.resetPassword({
        email: 'test@example.com',
        resetToken: 'reset-token-123',
        newPassword: 'newpassword123',
      });

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('reset successfully');
      expect(authService.resetPassword).toHaveBeenCalledWith(
        'test@example.com',
        'reset-token-123',
        'newpassword123',
      );
    });
  });

  describe('logout', () => {
    it('should log out successfully', async () => {
      const result = await controller.logout(res as Response);

      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Logged out successfully');
      expect(res.clearCookie).toHaveBeenCalledWith('Authentication', {
        path: '/',
        sameSite: expect.any(String),
        secure: expect.any(Boolean),
      });
    });
  });
});
