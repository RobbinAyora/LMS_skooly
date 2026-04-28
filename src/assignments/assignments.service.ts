import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AssignmentsService extends PrismaClient {
  async onModuleInit() {
    await this.$connect();
  }

  async getAllForUser(userId: string) {
    const enrollments = await this.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            assignments: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    const assignments = enrollments.flatMap(
      (enrollment) => enrollment.course.assignments,
    );

    return assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      courseId: a.courseId,
      courseTitle: a.course.title,
    }));
  }

  async getByCourse(courseId: string, userId: string) {
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

    const assignments = await this.assignment.findMany({
      where: { courseId },
      orderBy: { dueDate: 'asc' },
    });

    return {
      courseId,
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
      })),
    };
  }
}
