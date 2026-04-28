import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async createCourse(createCourseDto: CreateCourseDto) {
    return this.course.create({
      data: createCourseDto,
    });
  }

  async findAllCourses(userId: string) {
    const courses = await this.course.findMany({
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
      instructorId: course.instructorId,
      isEnrolled: course.enrollments.length > 0,
    }));
  }

  async findEnrolledCourses(userId: string) {
    const enrollments = await this.enrollment.findMany({
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
      instructorId: enrollment.course.instructorId,
      enrolledAt: enrollment.createdAt,
    }));
  }

  async enrollInCourse(userId: string, courseId: string) {
    const course = await this.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existingEnrollment = await this.enrollment.findUnique({
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

    return this.enrollment.create({
      data: {
        userId,
        courseId,
      },
    });
  }

  async findCourseById(userId: string, courseId: string) {
    const course = await this.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollment = await this.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    return course;
  }

  async getEnrollmentStatus(userId: string, courseId: string) {
    const enrollment = await this.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    return { isEnrolled: !!enrollment };
  }

  async getLessons(userId: string, courseId: string) {
    const course = await this.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollment = await this.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    const lessons = await this.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });

    return {
      courseId,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        content: lesson.content,
      })),
    };
  }
}
