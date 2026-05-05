import { Test, TestingModule } from '@nestjs/testing';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { BadRequestException } from '@nestjs/common';

describe('ProgressController', () => {
  let controller: ProgressController;
  let progressService: ProgressService;

  const mockProgress = {
    id: 'progress-1',
    userId: 'user-1',
    lessonId: 'lesson-1',
    completed: true,
    lastWatchedSeconds: 120,
    updatedAt: new Date(),
  };

  const mockCourseProgress = {
    courseId: 'course-1',
    progress: 75.5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [
        {
          provide: ProgressService,
          useValue: {
            markLessonComplete: jest.fn(),
            saveProgressTime: jest.fn(),
            getCourseProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProgressController>(ProgressController);
    progressService = module.get<ProgressService>(ProgressService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('markLessonComplete', () => {
    it('should mark lesson as complete for the user', async () => {
      const completeDto = {
        userId: 'user-1',
        lessonId: 'lesson-1',
      };

      jest
        .spyOn(progressService, 'markLessonComplete')
        .mockResolvedValue(mockProgress);

      const result = await controller.markLessonComplete(completeDto, 'user-1');

      expect(progressService.markLessonComplete).toHaveBeenCalledWith(
        completeDto,
      );
      expect(result).toEqual(mockProgress);
    });

    it('should throw error when userId does not match authenticated user', async () => {
      const completeDto = {
        userId: 'wrong-user',
        lessonId: 'lesson-1',
      };

      await expect(
        controller.markLessonComplete(completeDto, 'user-1'),
      ).rejects.toThrow('Unauthorized: You can only update your own progress');
    });

    it('should handle service errors', async () => {
      const completeDto = {
        userId: 'user-1',
        lessonId: 'lesson-1',
      };

      jest
        .spyOn(progressService, 'markLessonComplete')
        .mockRejectedValue(new BadRequestException('Lesson not found'));

      await expect(
        controller.markLessonComplete(completeDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveProgressTime', () => {
    it('should save progress time for the user', async () => {
      const saveTimeDto = {
        userId: 'user-1',
        lessonId: 'lesson-1',
        lastWatchedSeconds: 180,
      };

      const updatedProgress = { ...mockProgress, lastWatchedSeconds: 180 };
      jest
        .spyOn(progressService, 'saveProgressTime')
        .mockResolvedValue(updatedProgress);

      const result = await controller.saveProgressTime(saveTimeDto, 'user-1');

      expect(progressService.saveProgressTime).toHaveBeenCalledWith(
        saveTimeDto,
      );
      expect(result.lastWatchedSeconds).toBe(180);
    });

    it('should throw error when userId does not match authenticated user', async () => {
      const saveTimeDto = {
        userId: 'wrong-user',
        lessonId: 'lesson-1',
        lastWatchedSeconds: 180,
      };

      await expect(
        controller.saveProgressTime(saveTimeDto, 'user-1'),
      ).rejects.toThrow('Unauthorized: You can only update your own progress');
    });

    it('should handle service errors', async () => {
      const saveTimeDto = {
        userId: 'user-1',
        lessonId: 'lesson-1',
        lastWatchedSeconds: 180,
      };

      jest
        .spyOn(progressService, 'saveProgressTime')
        .mockRejectedValue(new BadRequestException('Lesson not found'));

      await expect(
        controller.saveProgressTime(saveTimeDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCourseProgress', () => {
    it('should get course progress for a student', async () => {
      jest
        .spyOn(progressService, 'getCourseProgress')
        .mockResolvedValue(mockCourseProgress);

      const result = await controller.getCourseProgress('course-1', 'user-1');

      expect(progressService.getCourseProgress).toHaveBeenCalledWith(
        'course-1',
        'user-1',
      );
      expect(result).toEqual(mockCourseProgress);
    });

    it('should throw error when student is not enrolled', async () => {
      jest
        .spyOn(progressService, 'getCourseProgress')
        .mockRejectedValue(
          new BadRequestException('You are not enrolled in this course'),
        );

      await expect(
        controller.getCourseProgress('course-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
