import Workspace from '../models/workspace.model';
import { IWorkspace, ICreateWorkspaceData, IUpdateWorkspaceData, IWorkspaceMember } from '../interfaces/workspace.interface';

const workspaceRepository = {
  findById: (id: string): Promise<IWorkspace | null> =>
    Workspace.findOne({ _id: id, isActive: { $ne: false } }),

  findByUserId: (userId: string): Promise<IWorkspace[]> =>
    Workspace.find({
      isActive: { $ne: false },
      $or: [
        { $expr: { $eq: [{ $toString: '$ownerId' }, userId] } },
        { members: { $elemMatch: { userId } } },
      ],
    }),

  create: (data: ICreateWorkspaceData & { members: IWorkspaceMember[] }): Promise<IWorkspace> =>
    Workspace.create(data),

  update: (id: string, data: IUpdateWorkspaceData): Promise<IWorkspace | null> =>
    Workspace.findByIdAndUpdate(id, { $set: data }, { new: true }),

  softDelete: (id: string): Promise<IWorkspace | null> =>
    Workspace.findByIdAndUpdate(
      id,
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true },
    ),

  addMember: (id: string, member: IWorkspaceMember): Promise<IWorkspace | null> =>
    Workspace.findByIdAndUpdate(
      id,
      { $push: { members: member } },
      { new: true },
    ),

  removeMember: (id: string, userId: string): Promise<IWorkspace | null> =>
    Workspace.findByIdAndUpdate(
      id,
      { $pull: { members: { userId } } },
      { new: true },
    ),

  updateMemberRole: (id: string, userId: string, role: string): Promise<IWorkspace | null> =>
    Workspace.findOneAndUpdate(
      { _id: id, 'members.userId': userId },
      { $set: { 'members.$.role': role } },
      { new: true },
    ),
};

export default workspaceRepository;
