import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import type { Response as ResponseType, Request as RequestType } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: { email: string; password: string; role: string }) {
    const roleValue = Role[body.role.toUpperCase()];
    return this.authService.register(body.email, body.password, roleValue);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(
    @Body() body: { email: string; resetToken: string; newPassword: string },
  ) {
    return this.authService.resetPassword(
      body.email,
      body.resetToken,
      body.newPassword,
    );
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: ResponseType,
  ) {
    const result = await this.authService.login(body.email, body.password);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('Authentication', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'none', // Always 'none' for cross-origin support
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      ...result,
      dashboardUrl: this.getDashboardUrl(result.role),
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: ResponseType) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('Authentication', {
      path: '/',
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentUser(@Req() req: RequestType) {
    const user = req.user as { userId: string; email: string; role: string };
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      dashboardUrl: this.getDashboardUrl(user.role),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(@Req() req: RequestType) {
    const user = req.user as { role: string };
    return {
      redirectUrl: this.getDashboardUrl(user.role),
    };
  }

  private getDashboardUrl(role: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    switch (role) {
      case Role.ADMIN:
        return `${baseUrl}/dashboard/admin`;
      case Role.INSTRUCTOR:
        return `${baseUrl}/dashboard/instructor`;
      case Role.STUDENT:
        return `${baseUrl}/dashboard/student`;
      default:
        return `${baseUrl}/dashboard`;
    }
  }
}
