import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProgressService', () => {
  let service: ProgressService;
  let mockPrismaService: any;

  const mockLesson = {
    id: 'lesson-1',
    title: 'Test Lesson',
    description: 'Test Description',
    videoUrl: 'https://cloudinary.com/video.mp4',
    duration: 300,
    courseId: 'course-1',
  };

  const mockProgress = {
    id: 'progress-1',
    userId: 'user-1',
    lessonId: 'lesson-1',
    completed: true,
    lastWatchedSeconds: 120,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      lesson: {
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      userLessonProgress: {
        upsert: jest.fn(),
        count: jest.fn(),
      },
      enrollment: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markLessonComplete', () => {
    const completeLessonDto = {
      userId: 'user-1',
      lessonId: 'lesson-1',
    };

    it('should mark lesson as complete', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.userLessonProgress.upsert.mockResolvedValue(
        mockProgress,
      );

      const result = await service.markLessonComplete(completeLessonDto);

      expect(mockPrismaService.userLessonProgress.upsert).toHaveBeenCalledWith({
        where: {
          userId_lessonId: {
            userId: 'user-1',
            lessonId: 'lesson-1',
          },
        },
        update: {
          completed: true,
        },
        create: {
          userId: 'user-1',
          lessonId: 'lesson-1',
          completed: true,
          lastWatchedSeconds: 0,
        },
      });
      expect(result).toEqual(mockProgress);
    });

    it('should throw NotFoundException when lesson does not exist', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(null);

      await expect(
        service.markLessonComplete(completeLessonDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update existing progress record', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.userLessonProgress.upsert.mockResolvedValue(
        mockProgress,
      );

      const result = await service.markLessonComplete(completeLessonDto);

      expect(result.completed).toBe(true);
    });
  });

  describe('saveProgressTime', () => {
    const saveProgressTimeDto = {
      userId: 'user-1',
      lessonId: 'lesson-1',
      lastWatchedSeconds: 180,
    };

    it('should save progress time successfully', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.userLessonProgress.upsert.mockResolvedValue({
        ...mockProgress,
        lastWatchedSeconds: 180,
      });

      const result = await service.saveProgressTime(saveProgressTimeDto);

      expect(mockPrismaService.userLessonProgress.upsert).toHaveBeenCalledWith({
        where: {
          userId_lessonId: {
            userId: 'user-1',
            lessonId: 'lesson-1',
          },
        },
        update: {
          lastWatchedSeconds: 180,
        },
        create: {
          userId: 'user-1',
          lessonId: 'lesson-1',
          completed: false,
          lastWatchedSeconds: 180,
        },
      });
      expect(result.lastWatchedSeconds).toBe(180);
    });

    it('should throw NotFoundException when lesson does not exist', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(null);

      await expect(
        service.saveProgressTime(saveProgressTimeDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle update of existing progress record', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.userLessonProgress.upsert.mockResolvedValue({
        ...mockProgress,
        lastWatchedSeconds: 180,
      });

      const result = await service.saveProgressTime(saveProgressTimeDto);

      expect(result.lastWatchedSeconds).toBe(180);
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 'course-1';
    const userId = 'user-1';

    it('should calculate course progress correctly', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        userId,
        courseId,
      });
      mockPrismaService.lesson.count.mockResolvedValue(4);
      mockPrismaService.userLessonProgress.count.mockResolvedValue(2);

      const result = await service.getCourseProgress(courseId, userId);

      expect(result).toEqual({
        courseId,
        progress: 50.0,
      });
    });

    it('should return 0% when no lessons in course', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        userId,
        courseId,
      });
      mockPrismaService.lesson.count.mockResolvedValue(0);

      const result = await service.getCourseProgress(courseId, userId);

      expect(result).toEqual({
        courseId,
        progress: 0,
      });
    });

    it('should throw BadRequestException when user is not enrolled', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.getCourseProgress(courseId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate progress with decimal precision', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        userId,
        courseId,
      });
      mockPrismaService.lesson.count.mockResolvedValue(3);
      mockPrismaService.userLessonProgress.count.mockResolvedValue(1);

      const result = await service.getCourseProgress(courseId, userId);

      expect(result.progress).toBeCloseTo(33.33, 1);
    });
  });
});
