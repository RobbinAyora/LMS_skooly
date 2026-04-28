import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StudentCoursesService } from './student-courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import type { StudentCourse } from './student-courses.service';

@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentCoursesController {
  constructor(private readonly studentCoursesService: StudentCoursesService) {}

  @Get('courses')
  async getMyCourses(
    @CurrentUser() user: CurrentUserData,
    @Query('status') status?: string,
  ): Promise<StudentCourse[]> {
    return this.studentCoursesService.getStudentCourses(user.userId, status);
  }
}
