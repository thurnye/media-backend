import PlatformAccount from '../models/platformAccount.model';
import { IPlatformAccount, ICreatePlatformAccountData, IUpdatePlatformAccountData } from '../interfaces/platformAccount.interface';

const platformAccountRepository = {
  findById: (id: string): Promise<IPlatformAccount | null> =>
    PlatformAccount.findOne({ _id: id, deletedAt: null }),

  /** All non-deleted accounts owned by a user. */
  findByUser: (userId: string): Promise<IPlatformAccount[]> =>
    PlatformAccount.find({ userId, deletedAt: null }),

  /** All non-deleted accounts linked to a workspace (queries array field). */
  findByWorkspace: (workspaceId: string): Promise<IPlatformAccount[]> =>
    PlatformAccount.find({ workspaceIds: workspaceId, deletedAt: null }),

  /** Check if user already owns this social account. */
  findByUserAndPlatformAccount: (userId: string, platform: string, accountId: string): Promise<IPlatformAccount | null> =>
    PlatformAccount.findOne({ userId, platform, accountId, deletedAt: null }),

  create: (data: ICreatePlatformAccountData): Promise<IPlatformAccount> =>
    PlatformAccount.create(data),

  update: (id: string, data: IUpdatePlatformAccountData): Promise<IPlatformAccount | null> =>
    PlatformAccount.findByIdAndUpdate(id, { $set: data }, { new: true }),

  /** Add a workspaceId to the array (idempotent via $addToSet). */
  addWorkspace: (id: string, workspaceId: string): Promise<IPlatformAccount | null> =>
    PlatformAccount.findByIdAndUpdate(
      id,
      { $addToSet: { workspaceIds: workspaceId } },
      { new: true },
    ),

  /** Remove a workspaceId from the array. */
  removeWorkspace: (id: string, workspaceId: string): Promise<IPlatformAccount | null> =>
    PlatformAccount.findByIdAndUpdate(
      id,
      { $pull: { workspaceIds: workspaceId } },
      { new: true },
    ),

  softDelete: (id: string): Promise<IPlatformAccount | null> =>
    PlatformAccount.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true },
    ),

  findExpiringTokens: (before: Date): Promise<IPlatformAccount[]> =>
    PlatformAccount.find({
      deletedAt: null,
      tokenExpiresAt: { $lte: before },
    }),
};

export default platformAccountRepository;
