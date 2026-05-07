import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCourse(createCourseDto: CreateCourseDto, instructorId: string) {
    const dbPayload = {
      ...createCourseDto,
      instructorId,
    };
    this.logger.log(
      `Final Course DB Payload (Service): ${JSON.stringify(dbPayload)}`,
    );
    try {
      return this.prisma.course.create({
        data: dbPayload,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAllCourses(userId: string) {
    try {
      const courses = await this.prisma.course.findMany({
        include: {
          enrollments: {
            where: { userId },
          },
        },
      });

      return courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        price: course.price,
        category: course.category,
        level: course.level,
        isPublished: course.isPublished,
        totalLessons: course.totalLessons,
        duration: course.duration,
        instructorId: course.instructorId,
        isEnrolled: course.enrollments.length > 0,
      }));
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findEnrolledCourses(userId: string) {
    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return enrollments.map((enrollment) => ({
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        thumbnail: enrollment.course.thumbnail,
        price: enrollment.course.price,
        category: enrollment.course.category,
        level: enrollment.course.level,
        isPublished: enrollment.course.isPublished,
        totalLessons: enrollment.course.totalLessons,
        duration: enrollment.course.duration,
        instructorId: enrollment.course.instructorId,
        enrolledAt: enrollment.createdAt,
      }));
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async enrollInCourse(userId: string, courseId: string) {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      const existingEnrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new ConflictException('Already enrolled in this course');
      }

      return this.prisma.enrollment.create({
        data: {
          userId,
          courseId,
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async findCourseById(userId: string, courseId: string, userRole: string) {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (userRole === 'ADMIN') {
        return course;
      }

      if (userRole === 'INSTRUCTOR') {
        if (course.instructorId !== userId) {
          throw new ForbiddenException('You do not own this course');
        }
        return course;
      }

      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });

      if (!enrollment) {
        throw new ForbiddenException('You are not enrolled in this course');
      }

      return course;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async getEnrollmentStatus(userId: string, courseId: string) {
    try {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      return { isEnrolled: !!enrollment };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getLessons(userId: string, courseId: string, userRole: string) {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (userRole === 'INSTRUCTOR') {
        if (course.instructorId !== userId) {
          throw new ForbiddenException('You do not own this course');
        }
      } else if (userRole !== 'ADMIN') {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
        });
        if (!enrollment) {
          throw new ForbiddenException('You are not enrolled in this course');
        }
      }

      const lessons = await this.prisma.lesson.findMany({
        where: { courseId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          videoUrl: true,
          duration: true,
          createdAt: true,
        },
      });

      return { courseId, lessons };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
