import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { CloudinaryService } from './cloudinary.service';
import { BadRequestException } from '@nestjs/common';

describe('UploadController', () => {
  let controller: UploadController;
  let cloudinaryService: CloudinaryService;

  const mockVideoFile = {
    buffer: Buffer.from('fake-video'),
    mimetype: 'video/mp4',
    size: 1024,
    originalname: 'video.mp4',
    encoding: '7bit',
    stream: null,
    fieldname: 'video',
    destination: './uploads',
    filename: 'video-123.mp4',
    path: './uploads/video-123.mp4',
  };

  const mockUploadResult = {
    url: 'https://cloudinary.com/video.mp4',
    publicId: 'lms-videos/abc123',
    duration: 300,
    format: 'mp4',
    resourceType: 'video',
    bytes: 1024,
    width: 1920,
    height: 1080,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: CloudinaryService,
          useValue: {
            uploadVideo: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /upload/video', () => {
    it('should upload video to Cloudinary and return result', async () => {
      jest
        .spyOn(cloudinaryService, 'uploadVideo')
        .mockResolvedValue(mockUploadResult);

      const result = await controller.uploadVideo(mockVideoFile as any);

      expect(cloudinaryService.uploadVideo).toHaveBeenCalledWith(
        mockVideoFile.buffer,
      );
      expect(result).toEqual(mockUploadResult); // Raw data, interceptor wraps globally
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.uploadVideo(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle Cloudinary upload failure', async () => {
      jest
        .spyOn(cloudinaryService, 'uploadVideo')
        .mockRejectedValue(new BadRequestException('Upload failed'));

      await expect(
        controller.uploadVideo(mockVideoFile as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
