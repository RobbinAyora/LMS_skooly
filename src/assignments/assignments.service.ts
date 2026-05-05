import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllForUser(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
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
    const enrollment = await this.prisma.enrollment.findUnique({
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

    const assignments = await this.prisma.assignment.findMany({
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
