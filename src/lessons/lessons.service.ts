import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CloudinaryService } from '../upload/cloudinary.service';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadVideo(
    video: Express.Multer.File | null,
    createLessonDto: CreateLessonDto,
    instructorId: string,
  ) {
    const {
      courseId,
      title,
      description,
      videoUrl: providedVideoUrl,
    } = createLessonDto;

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify instructor owns the course
    if (course.instructorId !== instructorId) {
      throw new BadRequestException(
        'You are not the instructor of this course',
      );
    }

    let finalVideoUrl: string;
    let duration: number | null = null;
    let cloudinaryPublicId: string | null = null;

    // Determine video source
    if (video && video.buffer && video.buffer.length > 0) {
      // Upload to Cloudinary FIRST
      const cloudinaryResult = await this.cloudinaryService.uploadVideo(
        video.buffer,
      );
      finalVideoUrl = cloudinaryResult.url;
      duration = cloudinaryResult.duration;
      cloudinaryPublicId = cloudinaryResult.publicId;
    } else if (providedVideoUrl) {
      finalVideoUrl = providedVideoUrl;
    } else {
      throw new BadRequestException(
        'Either video file or videoUrl must be provided',
      );
    }

    try {
      // Create lesson in DB
      const lesson = await this.prisma.lesson.create({
        data: {
          title,
          description,
          videoUrl: finalVideoUrl,
          duration: duration,
          courseId,
        },
      });

      return {
        ...lesson,
        videoUrl: finalVideoUrl,
      };
    } catch (error: any) {
      // Handle Prisma unique constraint violation (P2002)
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A lesson with this title already exists in the course',
        );
      }

      // If DB write fails AFTER Cloudinary upload, clean up orphaned file
      if (cloudinaryPublicId) {
        try {
          await this.cloudinaryService.deleteVideo(cloudinaryPublicId);
          console.log(
            `Rollback: Deleted orphaned Cloudinary file ${cloudinaryPublicId}`,
          );
        } catch (deleteError) {
          console.error(
            `Failed to delete orphaned file ${cloudinaryPublicId}:`,
            deleteError,
          );
        }
      }

      throw new InternalServerErrorException(
        'Failed to create lesson. Please try again.',
      );
    }
  }

  async getLessonsByCourse(courseId: string, studentId: string) {
    // Verify enrollment
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        courseId: courseId,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('You are not enrolled in this course');
    }

    // Get lessons
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        description: true,
        videoUrl: true,
        duration: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return lessons;
  }
}
