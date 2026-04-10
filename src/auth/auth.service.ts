import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(email: string, password: string, role: Role) {
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    console.log('=== OTP for', email, ':', otp, '===');

    await this.mailService.sendOTPEmail(email, otp);

    await this.usersService.create({
      email,
      password: hashedPassword,
      role,
      isVerified: false,
      otp,
      otpExpiry,
    });

    return { message: 'User registered. Please verify your email.' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      return { message: 'Email already verified' };
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP expired');
    }

    await this.usersService.update(user.id, {
      isVerified: true,
      otp: null,
      otpExpiry: null,
    });

    return { message: 'Email verified successfully.' };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first.');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      role: user.role,
    };
  }
}
