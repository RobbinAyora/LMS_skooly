import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { uploadConfig } from './upload.middleware';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('video')
  @UseInterceptors(
    FileInterceptor('video', {
      fileFilter: uploadConfig.videoFileFilter,
      limits: uploadConfig.limits,
      storage: uploadConfig.storage,
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadVideo(@UploadedFile() video: Express.Multer.File) {
    if (!video) {
      throw new BadRequestException('Video file is required');
    }

    const result = await this.cloudinaryService.uploadVideo(video.buffer);

    console.log('Cloudinary upload successful:', result.publicId);

    return result;
  }
}
