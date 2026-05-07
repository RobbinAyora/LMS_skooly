import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user if found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        role: 'STUDENT',
        isVerified: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'notfound@example.com' },
      });
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'hashed',
        role: Role.STUDENT,
        isVerified: false,
        otp: '123456',
        otpExpiry: new Date(),
      };
      const mockUser = {
        id: 'user-1',
        ...mockUserData,
        createdAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(mockUserData);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: mockUserData,
      });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const mockUserData = {
        isVerified: true,
        otp: null,
        otpExpiry: null,
      };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed',
        role: Role.STUDENT,
        ...mockUserData,
        createdAt: new Date(),
      };
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.update('user-1', mockUserData);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: mockUserData,
      });
    });
  });
});
