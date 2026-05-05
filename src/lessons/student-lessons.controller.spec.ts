import { Test, TestingModule } from '@nestjs/testing';
import { StudentLessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { BadRequestException } from '@nestjs/common';

describe('StudentLessonsController', () => {
  let controller: StudentLessonsController;
  let lessonsService: LessonsService;

  const mockLessons = [
    {
      id: 'lesson-1',
      title: 'Lesson 1',
      description: 'Description 1',
      videoUrl: 'https://cloudinary.com/video1.mp4',
      duration: 300,
    },
    {
      id: 'lesson-2',
      title: 'Lesson 2',
      description: 'Description 2',
      videoUrl: 'https://cloudinary.com/video2.mp4',
      duration: 450,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentLessonsController],
      providers: [
        {
          provide: LessonsService,
          useValue: {
            getLessonsByCourse: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudentLessonsController>(StudentLessonsController);
    lessonsService = module.get<LessonsService>(LessonsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLessons (Student)', () => {
    it('should return lessons for enrolled student', async () => {
      jest
        .spyOn(lessonsService, 'getLessonsByCourse')
        .mockResolvedValue(mockLessons);

      const result = await controller.getLessons('course-1', 'student-1');

      expect(lessonsService.getLessonsByCourse).toHaveBeenCalledWith(
        'course-1',
        'student-1',
      );
      expect(result).toEqual(mockLessons);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when course has no lessons', async () => {
      jest.spyOn(lessonsService, 'getLessonsByCourse').mockResolvedValue([]);

      const result = await controller.getLessons('course-1', 'student-1');

      expect(result).toEqual([]);
    });

    it('should throw error when student is not enrolled', async () => {
      jest
        .spyOn(lessonsService, 'getLessonsByCourse')
        .mockRejectedValue(
          new BadRequestException('You are not enrolled in this course'),
        );

      await expect(
        controller.getLessons('course-1', 'student-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
