export enum MediaType {
  IMAGE = "image",
  VIDEO = "video"
}

export enum MediaProcessingStatus {
  UPLOADED = "uploaded",
  PROCESSING = "processing",
  READY = "ready",
  FAILED = "failed"
}

export enum MediaStorageProvider {
  AWS_S3 = "aws_s3",
  CLOUDINARY = "cloudinary",
  LOCAL = "local"
}