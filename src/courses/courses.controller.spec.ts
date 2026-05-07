import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

describe('CoursesController', () => {
  let controller: CoursesController;
  let coursesService: CoursesService;

  const mockUser = {
    userId: 'instructor-1',
    role: 'INSTRUCTOR',
  };

  const mockCourse = {
    id: 'course-1',
    title: 'Test Course',
    description: 'Test Description',
    thumbnail: null,
    price: null,
    category: null,
    level: null,
    isPublished: false,
    totalLessons: 0,
    duration: null,
    instructorId: 'instructor-1',
    createdAt: new Date(),
  };

  const mockEnrolledCourse = {
    id: 'course-1',
    title: 'Enrolled Course',
    description: 'Description',
    thumbnail: 'https://example.com/thumb.jpg',
    price: 99.99,
    category: null,
    level: null,
    isPublished: false,
    totalLessons: 0,
    duration: null,
    instructorId: 'instructor-1',
    enrolledAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        {
          provide: CoursesService,
          useValue: {
            createCourse: jest.fn(),
            findAllCourses: jest.fn(),
            findEnrolledCourses: jest.fn(),
            enrollInCourse: jest.fn(),
            getLessons: jest.fn(),
            findCourseById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    coursesService = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /courses (Create Course - Instructor)', () => {
    it('should create a course successfully for instructor', async () => {
      const createCourseDto: CreateCourseDto = {
        title: 'New Course',
        description: 'Course description',
        thumbnail: 'https://example.com/thumb.jpg',
        price: 49.99,
      };

      jest.spyOn(coursesService, 'createCourse').mockResolvedValue(mockCourse);

      const result = await controller.createCourse(
        mockUser as any,
        createCourseDto,
      );

      expect(coursesService.createCourse).toHaveBeenCalledWith(
        createCourseDto,
        mockUser.userId,
      );
      expect(result).toEqual(mockCourse);
    });

    it('should create course without optional fields', async () => {
      const minimalDto: CreateCourseDto = {
        title: 'Minimal Course',
        description: 'Just the basics',
      };

      jest.spyOn(coursesService, 'createCourse').mockResolvedValue(mockCourse);

      const result = await controller.createCourse(mockUser as any, minimalDto);

      expect(coursesService.createCourse).toHaveBeenCalledWith(
        minimalDto,
        mockUser.userId,
      );
    });

    it('should handle service errors', async () => {
      const createCourseDto: CreateCourseDto = {
        title: 'Test Course',
        description: 'Test Description',
      };

      jest
        .spyOn(coursesService, 'createCourse')
        .mockRejectedValue(new BadRequestException('Course creation failed'));

      await expect(
        controller.createCourse(mockUser as any, createCourseDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /courses (List All Courses)', () => {
    it('should return all courses with enrollment status', async () => {
      const courses = [
        {
          id: 'course-1',
          title: 'Course 1',
          description: 'Description',
          thumbnail: null,
          price: null,
          category: null,
          level: null,
          isPublished: false,
          totalLessons: 0,
          duration: null,
          instructorId: 'instructor-1',
          isEnrolled: true,
        },
        {
          id: 'course-2',
          title: 'Course 2',
          description: 'Description',
          thumbnail: 'https://example.com/thumb.jpg',
          price: 99.99,
          category: null,
          level: null,
          isPublished: false,
          totalLessons: 0,
          duration: null,
          instructorId: 'instructor-2',
          isEnrolled: false,
        },
      ];

      jest.spyOn(coursesService, 'findAllCourses').mockResolvedValue(courses);

      const result = await controller.findAllCourses(mockUser as any);

      expect(coursesService.findAllCourses).toHaveBeenCalledWith(
        mockUser.userId,
      );
      expect(result).toEqual(courses);
    });

    it('should return empty array when no courses exist', async () => {
      jest.spyOn(coursesService, 'findAllCourses').mockResolvedValue([]);

      const result = await controller.findAllCourses(mockUser as any);

      expect(result).toEqual([]);
    });
  });

  describe('GET /courses/enrolled (List Enrolled Courses)', () => {
    it('should return enrolled courses', async () => {
      const enrolledCourses = [mockEnrolledCourse];

      jest
        .spyOn(coursesService, 'findEnrolledCourses')
        .mockResolvedValue(enrolledCourses);

      const result = await controller.findEnrolledCourses(mockUser as any);

      expect(coursesService.findEnrolledCourses).toHaveBeenCalledWith(
        mockUser.userId,
      );
      expect(result).toEqual(enrolledCourses);
    });
  });

  describe('POST /courses/:courseId/enroll (Enroll in Course)', () => {
    it('should enroll user in course successfully', async () => {
      const enrollment = {
        id: 'enrollment-1',
        userId: mockUser.userId,
        courseId: 'course-1',
        createdAt: new Date(),
      };

      jest
        .spyOn(coursesService, 'enrollInCourse')
        .mockResolvedValue(enrollment);

      const result = await controller.enrollInCourse(
        mockUser as any,
        'course-1',
      );

      expect(coursesService.enrollInCourse).toHaveBeenCalledWith(
        mockUser.userId,
        'course-1',
      );
      expect(result).toEqual(enrollment);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      jest
        .spyOn(coursesService, 'enrollInCourse')
        .mockRejectedValue(new NotFoundException('Course not found'));

      await expect(
        controller.enrollInCourse(mockUser as any, 'non-existent-course'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already enrolled', async () => {
      jest
        .spyOn(coursesService, 'enrollInCourse')
        .mockRejectedValue(
          new BadRequestException('Already enrolled in this course'),
        );

      await expect(
        controller.enrollInCourse(mockUser as any, 'course-1'),
      ).rejects.toThrow();
    });
  });

  describe('GET /courses/:courseId/lessons (Get Course Lessons)', () => {
    it('should return lessons for enrolled student', async () => {
      const lessons = {
        courseId: 'course-1',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            videoUrl: 'https://cloudinary.com/video1.mp4',
            content: 'Lesson content',
          },
        ],
      };

      jest.spyOn(coursesService, 'getLessons').mockResolvedValue(lessons);

      const result = await controller.getLessons(mockUser as any, 'course-1');

      expect(coursesService.getLessons).toHaveBeenCalledWith(
        mockUser.userId,
        'course-1',
      );
      expect(result).toEqual(lessons);
    });

    it('should throw ForbiddenException when not enrolled', async () => {
      jest
        .spyOn(coursesService, 'getLessons')
        .mockRejectedValue(
          new ForbiddenException('You are not enrolled in this course'),
        );

      await expect(
        controller.getLessons(mockUser as any, 'course-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('GET /courses/:courseId (Get Single Course)', () => {
    it('should return course details for enrolled student', async () => {
      const course = {
        id: 'course-1',
        title: 'Course Title',
        description: 'Description',
        thumbnail: null,
        price: null,
        category: null,
        level: null,
        isPublished: false,
        totalLessons: 0,
        duration: null,
        instructorId: 'instructor-1',
      };

      jest
        .spyOn(coursesService, 'findCourseById')
        .mockResolvedValue(course as any);

      const result = await controller.findCourseById(
        mockUser as any,
        'course-1',
      );

      expect(coursesService.findCourseById).toHaveBeenCalledWith(
        mockUser.userId,
        'course-1',
      );
      expect(result).toEqual(course);
    });

    it('should throw ForbiddenException when not enrolled', async () => {
      jest
        .spyOn(coursesService, 'findCourseById')
        .mockRejectedValue(
          new ForbiddenException('You are not enrolled in this course'),
        );

      await expect(
        controller.findCourseById(mockUser as any, 'course-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
