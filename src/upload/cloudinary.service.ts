import { Injectable, BadRequestException } from '@nestjs/common';
import cloudinary from '../config/cloudinary.config';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  duration: number | null;
  format: string;
  resourceType: string;
  bytes: number;
  width: number;
  height: number;
}

@Injectable()
export class CloudinaryService {
  /**
   * Upload a video buffer to Cloudinary
   * @param buffer - Video file buffer
   * @param folder - Cloudinary folder (default: lms-videos)
   * @returns Cloudinary upload result
   */
  async uploadVideo(
    buffer: Buffer,
    folder: string = 'lms-videos',
  ): Promise<CloudinaryUploadResult> {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(buffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration ? Math.round(result.duration) : null,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to upload video to Cloudinary',
      );
    }
  }

  /**
   * Delete a video from Cloudinary by public ID
   * @param publicId - Cloudinary public ID
   */
  async deleteVideo(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    } catch (error: any) {
      console.error('Cloudinary delete error:', error);
      throw new BadRequestException(`Failed to delete video: ${error.message}`);
    }
  }
}
