import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class EnrollmentService extends PrismaClient {
  async enrollUser(userId: string, courseId: string) {
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

  async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });
    return !!enrollment;
  }

  async getUserEnrollments(userId: string) {
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

  async verifyEnrollment(userId: string, courseId: string) {
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

    return enrollment;
  }
}
