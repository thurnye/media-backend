
import mongoose, { Schema } from "mongoose";
import { WorkspaceRole } from "../config/enums/workspace.enums";
import { IWorkspace } from "../interfaces/workspace.interface";

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },

    ownerId: { type: String, required: true, index: true },

    members: [
      {
        userId: { type: String, required: true },
        role: {
          type: String,
          enum: Object.values(WorkspaceRole),
          default: WorkspaceRole.MEMBER,
        },
        joinedAt: { type: Date, default: () => new Date() },
      },
    ],

    settings: {
      approvalRequired:   { type: Boolean, default: false },
      evergreenEnabled:   { type: Boolean, default: false },
      autoPublishEnabled: { type: Boolean, default: false },
    },

    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },

    defaultTimezone: { type: String, default: "America/New_York" },
    isActive: { type: Boolean, default: true },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes
WorkspaceSchema.index({ ownerId: 1 });
WorkspaceSchema.index({ slug: 1 }, { unique: true });
WorkspaceSchema.index({ "members.userId": 1 });

export default mongoose.model("Workspace", WorkspaceSchema);