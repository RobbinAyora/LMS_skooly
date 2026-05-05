import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteLessonDto, SaveProgressTimeDto } from './dto/progress.dto';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async markLessonComplete(completeLessonDto: CompleteLessonDto) {
    const { userId, lessonId } = completeLessonDto;

    // Verify the lesson exists
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Upsert the progress record: set completed to true
    const progress = await this.prisma.userLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        completed: true,
        // We don't update lastWatchedSeconds here, only completed
      },
      create: {
        userId,
        lessonId,
        completed: true,
        lastWatchedSeconds: 0, // default when creating
      },
    });

    return progress;
  }

  async saveProgressTime(saveProgressTimeDto: SaveProgressTimeDto) {
    const { userId, lessonId, lastWatchedSeconds } = saveProgressTimeDto;

    // Verify the lesson exists
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Upsert the progress record: update lastWatchedSeconds
    const progress = await this.prisma.userLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        lastWatchedSeconds,
        // We don't touch completed here
      },
      create: {
        userId,
        lessonId,
        completed: false, // default when creating
        lastWatchedSeconds,
      },
    });

    return progress;
  }

  async getCourseProgress(courseId: string, userId: string) {
    // Verify the user is enrolled in the course
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('You are not enrolled in this course');
    }

    // Get total lessons in the course
    const totalLessons = await this.prisma.lesson.count({
      where: { courseId: courseId },
    });

    if (totalLessons === 0) {
      return { courseId, progress: 0 };
    }

    // Get completed lessons for the user in this course
    const completedLessons = await this.prisma.userLessonProgress.count({
      where: {
        userId: userId,
        lesson: {
          courseId: courseId,
        },
        completed: true,
      },
    });

    const progress = (completedLessons / totalLessons) * 100;

    return {
      courseId,
      progress: Number(progress.toFixed(2)), // keep 2 decimal places
    };
  }
}
