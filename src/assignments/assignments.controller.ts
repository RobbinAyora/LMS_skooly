import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { AssignmentsService } from './assignments.service';

@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  async getAllAssignments(@CurrentUser() user: CurrentUserData) {
    return this.assignmentsService.getAllForUser(user.userId);
  }

  @Get(':courseId')
  async getAssignmentsByCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.assignmentsService.getByCourse(courseId, user.userId);
  }
}
