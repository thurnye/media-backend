import platformAccountRepository from '../repositories/platformAccount.repository';
import { IPlatformAccount, ICreatePlatformAccountData, IUpdatePlatformAccountData } from '../interfaces/platformAccount.interface';
import { Permission } from '../config/enums/permission.enums';
import { requirePermission, requireMembership } from '../utils/rbac';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { ConnectPlatformAccountSchema, validate } from '../validation/schemas';

const { PLATFORM_ACCOUNT } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

const platformAccountService = {
  /** Any workspace member can list connected accounts. */
  getPlatformAccounts: async (workspaceId: string, userId: string): Promise<IPlatformAccount[]> => {
    await requireMembership(workspaceId, userId);
    return platformAccountRepository.findByWorkspace(workspaceId);
  },

  /** Any workspace member can view a single account. */
  getPlatformAccount: async (id: string, userId: string): Promise<IPlatformAccount> => {
    const account = await platformAccountRepository.findById(id);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);

    await requireMembership(account.workspaceId, userId);
    return account;
  },

  /** ADMIN and MANAGER can connect a new platform account. */
  connectPlatformAccount: async (data: ICreatePlatformAccountData, userId: string): Promise<IPlatformAccount> => {
    const { error } = validate(ConnectPlatformAccountSchema, data);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    await requirePermission(data.workspaceId, userId, Permission.MANAGE_ACCOUNTS);

    const existing = await platformAccountRepository.findByWorkspaceAndPlatformAccount(
      data.workspaceId, data.platform, data.accountId,
    );
    if (existing) throw new AppError('BAD_REQUEST', PLATFORM_ACCOUNT.ALREADY_CONNECTED);

    return platformAccountRepository.create(data);
  },

  /** ADMIN and MANAGER can update account credentials/details. */
  updatePlatformAccount: async (id: string, data: IUpdatePlatformAccountData, userId: string): Promise<IPlatformAccount> => {
    const account = await platformAccountRepository.findById(id);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);

    await requirePermission(account.workspaceId, userId, Permission.MANAGE_ACCOUNTS);

    const updated = await platformAccountRepository.update(id, data);
    return updated!;
  },

  /** Only ADMIN can disconnect (soft-delete) a platform account. */
  disconnectPlatformAccount: async (id: string, userId: string): Promise<IPlatformAccount> => {
    const account = await platformAccountRepository.findById(id);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);

    await requirePermission(account.workspaceId, userId, Permission.DELETE_ACCOUNT);

    const deleted = await platformAccountRepository.softDelete(id);
    return deleted!;
  },
};

export default platformAccountService;
