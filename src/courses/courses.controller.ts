import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async findAllCourses(@CurrentUser() user: CurrentUserData) {
    return this.coursesService.findAllCourses(user.userId);
  }

  @Get('enrolled')
  async findEnrolledCourses(@CurrentUser() user: CurrentUserData) {
    return this.coursesService.findEnrolledCourses(user.userId);
  }

  @Post(':courseId/enroll')
  async enrollInCourse(
    @CurrentUser() user: CurrentUserData,
    @Param('courseId') courseId: string,
  ) {
    return this.coursesService.enrollInCourse(user.userId, courseId);
  }

  @Get(':courseId/lessons')
  async getLessons(
    @CurrentUser() user: CurrentUserData,
    @Param('courseId') courseId: string,
  ) {
    return this.coursesService.getLessons(user.userId, courseId);
  }

  @Get(':courseId')
  async findCourseById(
    @CurrentUser() user: CurrentUserData,
    @Param('courseId') courseId: string,
  ) {
    return this.coursesService.findCourseById(user.userId, courseId);
  }
}
