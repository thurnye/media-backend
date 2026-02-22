import path from 'path';
import fs from 'fs';
import mediaRepository from '../repositories/media.repository';
import { IMedia } from '../interfaces/media.interface';
import { MediaType, MediaStorageProvider, MediaProcessingStatus } from '../config/enums/media.enums';
import { AppError } from '../errors/AppError';

const UPLOAD_DIR = path.resolve('uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;  // 100 MB

function getMediaType(mimeType: string): MediaType {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return MediaType.IMAGE;
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return MediaType.VIDEO;
  throw new AppError('VALIDATION_ERROR', `Unsupported file type: ${mimeType}`);
}

const mediaService = {
  uploadMedia: async (
    file: Express.Multer.File,
    workspaceId: string,
    userId: string,
  ): Promise<IMedia> => {
    const mediaType = getMediaType(file.mimetype);

    const maxSize = mediaType === MediaType.IMAGE ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      fs.unlinkSync(file.path);
      throw new AppError(
        'VALIDATION_ERROR',
        `File too large. Max ${mediaType} size: ${maxSize / (1024 * 1024)}MB`,
      );
    }

    const url = `/uploads/${file.filename}`;

    return mediaRepository.create({
      workspaceId,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      provider: MediaStorageProvider.LOCAL,
      type: mediaType,
      processingStatus: MediaProcessingStatus.READY,
      uploadedBy: userId,
    });
  },

  deleteMedia: async (mediaId: string, userId: string): Promise<void> => {
    const media = await mediaRepository.findById(mediaId);
    if (!media) throw new AppError('NOT_FOUND', 'Media not found');

    if (media.uploadedBy !== userId) {
      throw new AppError('FORBIDDEN', 'You can only delete your own uploads');
    }

    const filePath = path.join(UPLOAD_DIR, path.basename(media.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await mediaRepository.deleteById(mediaId);
  },

  getMediaByIds: (ids: string[]): Promise<IMedia[]> =>
    mediaRepository.findByIds(ids),
};

export default mediaService;
