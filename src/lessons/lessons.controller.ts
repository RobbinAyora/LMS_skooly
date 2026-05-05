import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('INSTRUCTOR', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('video', {
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'video/mp4',
          'video/quicktime',
          'video/x-msvideo',
          'video/x-matroska',
          'video/webm',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only video files are allowed'),
            false,
          );
        }
      },
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
      },
      storage: multer.memoryStorage(),
    }),
  )
  async createLesson(
    @UploadedFile() video: Express.Multer.File,
    @Body() createLessonDto: CreateLessonDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (!video && !createLessonDto.videoUrl) {
      throw new BadRequestException(
        'Either video file or videoUrl must be provided',
      );
    }

    return this.lessonsService.uploadVideo(
      video || null,
      createLessonDto,
      user.userId,
    );
  }
}

// Student endpoint: Get lessons for a course
@Controller('student/courses')
@UseGuards(JwtAuthGuard)
export class StudentLessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':courseId/lessons')
  async getLessons(
    @Param('courseId') courseId: string,
    @CurrentUser('userId') studentId: string,
  ) {
    return this.lessonsService.getLessonsByCourse(courseId, studentId);
  }
}
