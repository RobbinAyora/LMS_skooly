import { Controller, Get, UseGuards } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('me/courses')
  async getMyCourses(@CurrentUser() user: CurrentUserData) {
    return this.enrollmentService.getUserEnrollments(user.userId);
  }
}
