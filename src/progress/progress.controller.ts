import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { CompleteLessonDto, SaveProgressTimeDto } from './dto/progress.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('complete')
  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  async markLessonComplete(
    @Body() completeLessonDto: CompleteLessonDto,
    @CurrentUser('userId') authUserId: string,
  ) {
    // Ensure the userId in the body matches the authenticated user's id
    if (completeLessonDto.userId !== authUserId) {
      throw new BadRequestException(
        'Unauthorized: You can only update your own progress',
      );
    }
    return this.progressService.markLessonComplete(completeLessonDto);
  }

  @Post('time')
  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  async saveProgressTime(
    @Body() saveProgressTimeDto: SaveProgressTimeDto,
    @CurrentUser('userId') authUserId: string,
  ) {
    // Ensure the userId in the body matches the authenticated user's id
    if (saveProgressTimeDto.userId !== authUserId) {
      throw new BadRequestException(
        'Unauthorized: You can only update your own progress',
      );
    }
    return this.progressService.saveProgressTime(saveProgressTimeDto);
  }

  @Get('course/:courseId')
  @UseGuards(RolesGuard)
  @Roles('STUDENT')
  async getCourseProgress(
    @Param('courseId') courseId: string,
    @CurrentUser('userId') studentId: string,
  ) {
    // Enrollment check in service
    return this.progressService.getCourseProgress(courseId, studentId);
  }
}
