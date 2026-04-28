import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
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

    // await this.mailService.sendOTPEmail(email, otp); // commented for testing

    const createdUser = await this.usersService.create({
      email,
      password: hashedPassword,
      role,
      isVerified: false,
      otp,
      otpExpiry,
    });

    const welcomeMessages = {
      STUDENT:
        'Welcome to the LMS! Start your learning journey by exploring our courses.',
      INSTRUCTOR:
        'Welcome! Start creating and managing your courses to share knowledge with students.',
      ADMIN:
        'Welcome, Admin! You now have access to manage the entire LMS platform.',
    };

    const message = welcomeMessages[role] || welcomeMessages.STUDENT;

    try {
      await this.notificationsService.createNotification({
        userId: createdUser.id,
        type: 'SYSTEM_ALERT',
        title: 'Welcome to the LMS!',
        message,
      });
    } catch (error) {
      console.error('Welcome notification failed:', error);
    }

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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    console.log('=== Reset Token for', email, ':', resetToken, '===');

    await this.usersService.update(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    await this.mailService.sendResetPasswordEmail(email, resetToken);

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(email: string, resetToken: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    if (!user.resetToken || user.resetToken !== resetToken) {
      throw new BadRequestException('Invalid reset token');
    }

    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return { message: 'Password reset successfully' };
  }
}
