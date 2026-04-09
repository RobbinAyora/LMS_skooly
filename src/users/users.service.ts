import { Injectable } from '@nestjs/common';
import { User, Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: {
    email: string;
    password: string;
    role: Role;
    isVerified?: boolean;
    otp?: string | null;
    otpExpiry?: Date | null;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Partial<User>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async createUser(email: string, password: string, role: Role) {
    return this.prisma.user.create({
      data: {
        email,
        password,
        role,
      },
    });
  }
}
