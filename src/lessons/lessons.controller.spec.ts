import { Test, TestingModule } from '@nestjs/testing';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';

describe('LessonsController', () => {
  let controller: LessonsController;
  let lessonsService: LessonsService;

  const mockLesson = {
    id: 'lesson-1',
    title: 'Test Lesson',
    description: 'Test Description',
    videoUrl: 'https://cloudinary.com/video.mp4',
    duration: 300,
    courseId: 'course-1',
    order: null,
    createdAt: new Date(),
  };

  const mockVideoFile = {
    buffer: Buffer.from('fake-video'),
    mimetype: 'video/mp4',
    size: 1024,
    originalname: 'video.mp4',
    encoding: '7bit',
    stream: Readable.from([]),
    fieldname: 'video',
    destination: './uploads',
    filename: 'video-123.mp4',
    path: './uploads/video-123.mp4',
  };

  const mockUser = {
    userId: 'instructor-1',
    role: 'INSTRUCTOR',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonsController],
      providers: [
        {
          provide: LessonsService,
          useValue: {
            uploadVideo: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LessonsController>(LessonsController);
    lessonsService = module.get<LessonsService>(LessonsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /lessons (Create Lesson - Instructor)', () => {
    it('should create lesson with video file upload', async () => {
      const createLessonDto: CreateLessonDto = {
        title: 'Test Lesson',
        description: 'Test Description',
        courseId: 'course-1',
      };

      jest.spyOn(lessonsService, 'uploadVideo').mockResolvedValue(mockLesson);

      const result = await controller.createLesson(
        mockVideoFile,
        createLessonDto,
        mockUser as any,
      );

      expect(lessonsService.uploadVideo).toHaveBeenCalledWith(
        mockVideoFile,
        createLessonDto,
        'instructor-1',
      );
      expect(result).toEqual(mockLesson);
    });

    it('should create lesson with videoUrl (no file)', async () => {
      const createLessonDto: CreateLessonDto = {
        title: 'Test Lesson',
        description: 'Test Description',
        courseId: 'course-1',
        videoUrl: 'https://external.com/video.mp4',
      };

      jest.spyOn(lessonsService, 'uploadVideo').mockResolvedValue(mockLesson);

      const result = await controller.createLesson(
        null as any,
        createLessonDto,
        mockUser as any,
      );

      expect(lessonsService.uploadVideo).toHaveBeenCalledWith(
        null,
        createLessonDto,
        'instructor-1',
      );
      expect(result).toEqual(mockLesson);
    });

    it('should throw BadRequestException when neither file nor videoUrl provided', async () => {
      const createLessonDto: CreateLessonDto = {
        title: 'Test Lesson',
        description: 'Test Description',
        courseId: 'course-1',
      };

      await expect(
        controller.createLesson(null as any, createLessonDto, mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors', async () => {
      const createLessonDto: CreateLessonDto = {
        title: 'Test Lesson',
        description: 'Test Description',
        courseId: 'course-1',
      };

      jest
        .spyOn(lessonsService, 'uploadVideo')
        .mockRejectedValue(new NotFoundException('Course not found'));

      await expect(
        controller.createLesson(
          mockVideoFile,
          createLessonDto,
          mockUser as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
