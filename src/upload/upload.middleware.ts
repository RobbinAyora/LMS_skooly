import * as multer from 'multer';

export const uploadConfig = {
  // Video file filter
  videoFileFilter: (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new Error('Invalid file type. Only video files are allowed.'),
        false,
      );
    }
  },

  // File size limits
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },

  // Storage configuration - use memory for direct Cloudinary upload
  storage: multer.memoryStorage(),
};
