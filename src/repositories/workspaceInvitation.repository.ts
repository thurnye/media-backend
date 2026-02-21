import WorkspaceInvitation from '../models/workspaceInvitation.model';
import { ICreateWorkspaceInvitationData, IWorkspaceInvitation, InvitationStatus } from '../interfaces/workspaceInvitation.interface';

const workspaceInvitationRepository = {
  create: (data: ICreateWorkspaceInvitationData): Promise<IWorkspaceInvitation> =>
    WorkspaceInvitation.create(data),

  findByToken: (token: string): Promise<IWorkspaceInvitation | null> =>
    WorkspaceInvitation.findOne({ token }),

  findByWorkspaceAndEmail: (workspaceId: string, email: string): Promise<IWorkspaceInvitation | null> =>
    WorkspaceInvitation.findOne({ workspaceId, email, status: 'pending' }),

  findByWorkspace: (workspaceId: string): Promise<IWorkspaceInvitation[]> =>
    WorkspaceInvitation.find({ workspaceId, status: 'pending' }),

  updateStatus: (id: string, status: InvitationStatus): Promise<IWorkspaceInvitation | null> =>
    WorkspaceInvitation.findByIdAndUpdate(id, { $set: { status } }, { new: true }),

  deleteByWorkspaceAndEmail: (workspaceId: string, email: string): Promise<boolean> =>
    WorkspaceInvitation.deleteOne({ workspaceId, email, status: 'pending' }).then(r => r.deletedCount > 0),
};

export default workspaceInvitationRepository;
