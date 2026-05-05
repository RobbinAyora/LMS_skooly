import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from './cloudinary.service';
import cloudinary from '../config/cloudinary.config';

// Mock the cloudinary package
jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload_stream: jest.fn(),
    },
    config: jest.fn(),
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  const mockUploadStream = cloudinary.uploader.upload_stream as jest.Mock;

  const videoBuffer = Buffer.from('fake-video-buffer');
  const mockCloudinaryResponse = {
    secure_url: 'https://cloudinary.com/video.mp4',
    public_id: 'lms-videos/test123',
    duration: 300.5,
    format: 'mp4',
    resource_type: 'video',
    bytes: 1024,
    width: 1920,
    height: 1080,
  };

  beforeEach(async () => {
    mockUploadStream.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryService],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadVideo', () => {
    it('should upload video to Cloudinary and return parsed result', async () => {
      mockUploadStream.mockImplementation((options, callback) => ({
        end: (buffer: Buffer) => {
          setImmediate(() => callback(null, mockCloudinaryResponse));
        },
      }));

      const result = await service.uploadVideo(videoBuffer);

      expect(mockUploadStream).toHaveBeenCalledWith(
        {
          resource_type: 'video',
          folder: 'lms-videos',
        },
        expect.any(Function),
      );
      expect(result).toEqual({
        url: 'https://cloudinary.com/video.mp4',
        publicId: 'lms-videos/test123',
        duration: 301,
        format: 'mp4',
        resourceType: 'video',
        bytes: 1024,
        width: 1920,
        height: 1080,
      });
    });

    it('should handle Cloudinary upload error', async () => {
      mockUploadStream.mockImplementation((options, callback) => ({
        end: (buffer: Buffer) => {
          setImmediate(() => callback(new Error('Network error'), null));
        },
      }));

      await expect(service.uploadVideo(videoBuffer)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle null duration gracefully', async () => {
      const responseWithoutDuration = {
        ...mockCloudinaryResponse,
        duration: null,
      };
      mockUploadStream.mockImplementation((options, callback) => ({
        end: (buffer: Buffer) => {
          setImmediate(() => callback(null, responseWithoutDuration));
        },
      }));

      const result = await service.uploadVideo(videoBuffer);
      expect(result.duration).toBeNull();
    });
  });
});
