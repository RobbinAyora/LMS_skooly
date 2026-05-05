import { Test, TestingModule } from '@nestjs/testing';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../upload/cloudinary.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

// Mock cloudinary config (not used directly, but needed for import)
jest.mock('../config/cloudinary.config', () => ({
  default: {
    uploader: {
      upload_stream: jest.fn(),
    },
  },
}));

 describe('LessonsService', () => {
   let service: LessonsService;
   let mockPrismaService: any;
   let mockCloudinaryService: any;

  const mockCourse = {
    id: 'course-1',
    title: 'Test Course',
    instructorId: 'instructor-1',
  };

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

  const videoBuffer = Buffer.from('fake-video-buffer');

   beforeEach(async () => {
     mockPrismaService = {
       course: {
         findUnique: jest.fn(),
       },
       lesson: {
         create: jest.fn(),
         findMany: jest.fn(),
       },
       enrollment: {
         findFirst: jest.fn(),
       },
     } as any;

     mockCloudinaryService = {
       uploadVideo: jest.fn(),
     } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadVideo', () => {
    const createLessonDto = {
      title: 'Test Lesson',
      description: 'Test Description',
      courseId: 'course-1',
    };
    const instructorId = 'instructor-1';

    it('should upload video file and create lesson', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockCloudinaryService.uploadVideo!.mockResolvedValue({
        url: 'https://cloudinary.com/video.mp4',
        duration: 300,
      });
      mockPrismaService.lesson.create.mockResolvedValue(mockLesson);

      const result = await service.uploadVideo(
        { buffer: videoBuffer } as Express.Multer.File,
        createLessonDto,
        instructorId,
      );

      expect(mockCloudinaryService.uploadVideo).toHaveBeenCalledWith(
        videoBuffer,
      );
      expect(mockPrismaService.lesson.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Lesson',
          description: 'Test Description',
          videoUrl: 'https://cloudinary.com/video.mp4',
          duration: 300,
          courseId: 'course-1',
        },
      });
      expect(result.videoUrl).toBe('https://cloudinary.com/video.mp4');
    });

    it('should use provided videoUrl when no file uploaded', async () => {
      const dtoWithUrl = {
        ...createLessonDto,
        videoUrl: 'https://external.com/video.mp4',
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.lesson.create.mockResolvedValue(mockLesson);

      const result = await service.uploadVideo(null, dtoWithUrl, instructorId);

      expect(mockCloudinaryService.uploadVideo).not.toHaveBeenCalled();
      expect(mockPrismaService.lesson.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Lesson',
          description: 'Test Description',
          videoUrl: 'https://external.com/video.mp4',
          duration: null,
          courseId: 'course-1',
        },
      });
    });

    it('should throw NotFoundException when course does not exist', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadVideo(
          { buffer: videoBuffer } as Express.Multer.File,
          createLessonDto,
          instructorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when instructor is not course owner', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        instructorId: 'different-instructor',
      });

      await expect(
        service.uploadVideo(
          { buffer: videoBuffer } as Express.Multer.File,
          createLessonDto,
          instructorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when neither file nor videoUrl provided', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.uploadVideo(null, createLessonDto, instructorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle Cloudinary upload failure', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockCloudinaryService.uploadVideo!.mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        service.uploadVideo(
          { buffer: videoBuffer } as Express.Multer.File,
          createLessonDto,
          instructorId,
        ),
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('getLessonsByCourse', () => {
    const courseId = 'course-1';
    const studentId = 'student-1';

    it('should return lessons when student is enrolled', async () => {
      const lessons = [
        {
          id: 'lesson-1',
          title: 'Lesson 1',
          description: 'Description 1',
          videoUrl: 'https://cloudinary.com/video1.mp4',
          duration: 300,
          order: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        userId: studentId,
        courseId,
      });
      mockPrismaService.lesson.findMany.mockResolvedValue(lessons as any);

      const result = await service.getLessonsByCourse(courseId, studentId);

      expect(result).toEqual(lessons);
    });

    it('should throw BadRequestException when student is not enrolled', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.getLessonsByCourse(courseId, studentId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return empty array when course has no lessons', async () => {
      mockPrismaService.enrollment.findFirst.mockResolvedValue({
        userId: studentId,
        courseId,
      });
      mockPrismaService.lesson.findMany.mockResolvedValue([]);

      const result = await service.getLessonsByCourse(courseId, studentId);

      expect(result).toEqual([]);
    });
  });
});
