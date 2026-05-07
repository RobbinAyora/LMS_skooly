import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
  Logger,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);

  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  async createCourse(
    @CurrentUser() user: CurrentUserData,
    @Body() createCourseDto: CreateCourseDto,
  ) {
    this.logger.log(
      `Incoming Course DTO (Controller): ${JSON.stringify(createCourseDto)}`,
    );
    return this.coursesService.createCourse(createCourseDto, user.userId);
  }

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
    return this.coursesService.getLessons(user.userId, courseId, user.role);
  }

  @Get(':courseId')
  async findCourseById(
    @CurrentUser() user: CurrentUserData,
    @Param('courseId') courseId: string,
  ) {
    return this.coursesService.findCourseById(user.userId, courseId, user.role);
  }
}
