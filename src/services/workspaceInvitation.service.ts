import { v4 as uuidv4 } from 'uuid';
import workspaceInvitationRepository from '../repositories/workspaceInvitation.repository';
import workspaceRepository from '../repositories/workspace.repository';
import userRepository from '../repositories/user.repository';
import emailService from './email.service';
import { WorkspaceRole } from '../config/enums/workspace.enums';
import { Permission } from '../config/enums/permission.enums';
import { requireMembership, requirePermission } from '../utils/rbac';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { IWorkspaceInvitation } from '../interfaces/workspaceInvitation.interface';
import { IWorkspace } from '../interfaces/workspace.interface';

const { WORKSPACE } = GLOBAL_CONSTANTS.ERROR_MESSAGE;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';
const INVITE_EXPIRY_DAYS = 7;

const workspaceInvitationService = {
  inviteToWorkspace: async (
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    callerId: string,
  ): Promise<IWorkspaceInvitation> => {
    // Any workspace member can invite.
    await requireMembership(workspaceId, callerId);

    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) throw new AppError('NOT_FOUND', WORKSPACE.NOT_FOUND);

    const callerIsOwner = workspace.ownerId === callerId;
    const callerRole = workspace.members.find((member) => member.userId === callerId)?.role;
    const callerCanAssignRoles = callerIsOwner || callerRole === WorkspaceRole.ADMIN;
    const effectiveRole = callerCanAssignRoles ? role : WorkspaceRole.MEMBER;

    // Check if email already belongs to a member
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const uid = (existingUser as any)._id.toString();
      const alreadyMember = workspace.members.some(m => m.userId === uid);
      if (alreadyMember) throw new AppError('BAD_REQUEST', WORKSPACE.CANNOT_INVITE_MEMBER);
    }

    // Check for existing pending invitation
    const existing = await workspaceInvitationRepository.findByWorkspaceAndEmail(workspaceId, email);
    if (existing) throw new AppError('BAD_REQUEST', WORKSPACE.ALREADY_INVITED);

    // Create invitation
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invitation = await workspaceInvitationRepository.create({
      workspaceId,
      email,
      role: effectiveRole,
      invitedBy: callerId,
      token,
      expiresAt,
    });

    // Send email
    const inviter = await userRepository.findById(callerId);
    const inviterName = inviter
      ? [inviter.firstName, inviter.lastName].filter(Boolean).join(' ')
      : 'A team member';

    const acceptUrl = `${CLIENT_URL}/invite/accept?token=${token}`;
    await emailService.sendWorkspaceInvitation(email, inviterName, workspace.name, acceptUrl);

    return invitation;
  },

  acceptInvitation: async (token: string, userId: string): Promise<IWorkspace> => {
    const invitation = await workspaceInvitationRepository.findByToken(token);
    if (!invitation) throw new AppError('NOT_FOUND', WORKSPACE.INVITATION_NOT_FOUND);
    if (invitation.status !== 'pending') throw new AppError('BAD_REQUEST', WORKSPACE.INVITATION_EXPIRED);
    if (new Date() > invitation.expiresAt) throw new AppError('BAD_REQUEST', WORKSPACE.INVITATION_EXPIRED);

    const workspace = await workspaceRepository.findById(invitation.workspaceId);
    if (!workspace) throw new AppError('NOT_FOUND', WORKSPACE.NOT_FOUND);

    // Check not already a member
    const alreadyMember = workspace.members.some(m => m.userId === userId);
    if (!alreadyMember) {
      const joinedAt = new Date();
      await workspaceRepository.addMember(invitation.workspaceId, {
        userId,
        role: invitation.role,
        joinedAt,
      });
      await userRepository.addWorkspace(userId, {
        workspaceId: invitation.workspaceId,
        role: invitation.role,
        joinedAt,
      });
    }

    await workspaceInvitationRepository.updateStatus((invitation as any)._id.toString(), 'accepted');

    const updated = await workspaceRepository.findById(invitation.workspaceId);
    return updated!;
  },

  getWorkspaceInvitations: async (workspaceId: string, callerId: string): Promise<IWorkspaceInvitation[]> => {
    await requirePermission(workspaceId, callerId, Permission.MANAGE_USERS);
    return workspaceInvitationRepository.findByWorkspace(workspaceId);
  },

  revokeInvitation: async (workspaceId: string, email: string, callerId: string): Promise<boolean> => {
    await requirePermission(workspaceId, callerId, Permission.MANAGE_USERS);
    return workspaceInvitationRepository.deleteByWorkspaceAndEmail(workspaceId, email);
  },
};

export default workspaceInvitationService;
