import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export type CourseStatus = 'all' | 'in-progress' | 'completed';

export interface StudentCourse {
  courseId: string;
  title: string;
  thumbnail: string | null;
  progress: number; // 0-100
  status: 'in-progress' | 'completed';
}

@Injectable()
export class StudentCoursesService
  extends PrismaClient
  implements OnModuleInit
{
  async onModuleInit() {
    await this.$connect();
  }

  async getStudentCourses(
    userId: string,
    status?: string,
  ): Promise<StudentCourse[]> {
    // Validate status parameter; default to 'all' if invalid
    const validStatuses: CourseStatus[] = ['all', 'in-progress', 'completed'];
    const normalizedStatus: CourseStatus | undefined =
      status && validStatuses.includes(status as CourseStatus)
        ? (status as CourseStatus)
        : 'all';

    // Get all enrollments for the user with course and lessons
    const enrollments = await this.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            lessons: true,
            _count: {
              select: { lessons: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get user's lesson progress for all lessons in these courses
    const courseIds = enrollments.map((e) => e.courseId);
    const allLessonIds = enrollments.flatMap((e) =>
      e.course.lessons.map((l) => l.id),
    );

    const userProgressRecords =
      allLessonIds.length > 0
        ? await this.userLessonProgress.findMany({
            where: {
              userId,
              lessonId: { in: allLessonIds },
              completed: true,
            },
          })
        : [];

    // Build a map: lessonId -> bool (completed)
    const completedLessonIds = new Set(
      userProgressRecords.map((p) => p.lessonId),
    );

    // Compute progress per course
    const coursesWithProgress: StudentCourse[] = enrollments.map(
      (enrollment) => {
        const course = enrollment.course;
        const totalLessons = course.lessons.length;
        const completedLessons = course.lessons.filter((lesson) =>
          completedLessonIds.has(lesson.id),
        ).length;

        const progress =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        const courseStatus: 'in-progress' | 'completed' =
          progress >= 100 ? 'completed' : 'in-progress';

        return {
          courseId: course.id,
          title: course.title,
          thumbnail: course.thumbnail,
          progress,
          status: courseStatus,
        };
      },
    );

    // Filter by status if provided and valid
    if (normalizedStatus !== 'all') {
      return coursesWithProgress.filter((c) => c.status === normalizedStatus);
    }

    return coursesWithProgress;
  }
}
