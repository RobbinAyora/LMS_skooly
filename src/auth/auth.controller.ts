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
  register(@Body() body: { email: string; password: string; role: Role }) {
    return this.authService.register(body.email, body.password, body.role);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: ResponseType,
  ) {
    const result = await this.authService.login(body.email, body.password);

    res.cookie('Authentication', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return {
      ...result,
      dashboardUrl: this.getDashboardUrl(result.role),
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: ResponseType) {
    res.clearCookie('Authentication');
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
