import mongoose, { Schema } from "mongoose";
import { IMedia } from "../interfaces/media.interface";
import { MediaProcessingStatus, MediaStorageProvider, MediaType } from "../config/enums/media.enums";

const MediaSchema = new Schema<IMedia>(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true
    },

    originalFileName: String,
    mimeType: String,
    size: Number,

    url: {
      type: String,
      required: true
    },

    thumbnailUrl: String,

    provider: {
      type: String,
      enum: Object.values(MediaStorageProvider),
      required: true
    },

    type: {
      type: String,
      enum: Object.values(MediaType),
      required: true
    },

    processingStatus: {
      type: String,
      enum: Object.values(MediaProcessingStatus),
      default: MediaProcessingStatus.UPLOADED
    },

    duration: Number,
    width: Number,
    height: Number,

    uploadedBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Media', MediaSchema);