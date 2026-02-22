import { MediaType, MediaProcessingStatus, MediaStorageProvider } from "../config/enums/media.enums";

export interface IMedia {
  _id?: string;

  workspaceId: string;

  /**
   * Upload metadata
   */
  originalFileName?: string;
  mimeType?: string;
  size?: number;

  /**
   * Storage location
   */
  url: string;
  thumbnailUrl?: string;
  provider: MediaStorageProvider;

  type: MediaType;

  /**
   * Processing pipeline
   */
  processingStatus: MediaProcessingStatus;

  duration?: number;

  width?: number;
  height?: number;

  /**
   * Audit trail
   */
  uploadedBy: string;

  createdAt?: Date;
  updatedAt?: Date;
}