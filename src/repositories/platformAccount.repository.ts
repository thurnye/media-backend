import PlatformAccount from '../models/platformAccount.model';
import { IPlatformAccount, ICreatePlatformAccountData, IUpdatePlatformAccountData } from '../interfaces/platformAccount.interface';

const platformAccountRepository = {
  findById: (id: string): Promise<IPlatformAccount | null> =>
    PlatformAccount.findOne({ _id: id, deletedAt: null }),

  findByWorkspace: (workspaceId: string): Promise<IPlatformAccount[]> =>
    PlatformAccount.find({ workspaceId, deletedAt: null }),

  findByWorkspaceAndPlatformAccount: (workspaceId: string, platform: string, accountId: string): Promise<IPlatformAccount | null> =>
    PlatformAccount.findOne({ workspaceId, platform, accountId, deletedAt: null }),

  create: (data: ICreatePlatformAccountData): Promise<IPlatformAccount> =>
    PlatformAccount.create(data),

  update: (id: string, data: IUpdatePlatformAccountData): Promise<IPlatformAccount | null> =>
    PlatformAccount.findByIdAndUpdate(id, { $set: data }, { new: true }),

  softDelete: (id: string): Promise<IPlatformAccount | null> =>
    PlatformAccount.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true },
    ),
};

export default platformAccountRepository;
