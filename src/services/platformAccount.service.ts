import platformAccountRepository from '../repositories/platformAccount.repository';
import { IPlatformAccount, ICreatePlatformAccountData, IUpdatePlatformAccountData } from '../interfaces/platformAccount.interface';
import { Permission } from '../config/enums/permission.enums';
import { requirePermission, requireMembership } from '../utils/rbac';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { ConnectPlatformAccountSchema, LinkPlatformAccountSchema, UnlinkPlatformAccountSchema, validate } from '../validation/schemas';
import { encrypt, decrypt } from '../utils/crypto';

const { PLATFORM_ACCOUNT } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

/** Encrypt token fields before storing. */
function encryptTokens(data: Record<string, any>): void {
  if (data.accessToken) data.accessToken = encrypt(data.accessToken);
  if (data.refreshToken) data.refreshToken = encrypt(data.refreshToken);
}

/** Decrypt token fields after reading (returns a plain object). */
function decryptAccount(account: IPlatformAccount): IPlatformAccount {
  const obj = typeof (account as any).toObject === 'function'
    ? (account as any).toObject({ virtuals: true })
    : { ...account };
  try {
    if (obj.accessToken) obj.accessToken = decrypt(obj.accessToken);
  } catch { /* token may already be plaintext (legacy data) */ }
  try {
    if (obj.refreshToken) obj.refreshToken = decrypt(obj.refreshToken);
  } catch { /* ignore */ }
  return obj;
}

const platformAccountService = {
  /** Any workspace member can list accounts linked to that workspace. */
  getPlatformAccounts: async (workspaceId: string, userId: string): Promise<IPlatformAccount[]> => {
    await requireMembership(workspaceId, userId);
    return platformAccountRepository.findByWorkspace(workspaceId);
    // Tokens are NOT decrypted for list views
  },

  /** Returns all accounts owned by the authenticated user (cross-workspace). */
  getUserAccounts: async (userId: string): Promise<IPlatformAccount[]> => {
    return platformAccountRepository.findByUser(userId);
  },

  /** Any workspace member can view a single account linked to their workspace. */
  getPlatformAccount: async (id: string, userId: string): Promise<IPlatformAccount> => {
    const account = await platformAccountRepository.findById(id);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);

    // User is either the owner or a member of a linked workspace
    if (account.userId !== userId) {
      let hasMembership = false;
      for (const wsId of account.workspaceIds) {
        try {
          await requireMembership(wsId, userId);
          hasMembership = true;
          break;
        } catch { /* try next workspace */ }
      }
      if (!hasMembership) {
        throw new AppError('FORBIDDEN', GLOBAL_CONSTANTS.ERROR_MESSAGE.AUTH.FORBIDDEN);
      }
    }
    return account;
  },

  /** Get account with decrypted tokens (internal use only, e.g. publishing). */
  getAccountWithTokens: async (id: string): Promise<IPlatformAccount> => {
    const account = await platformAccountRepository.findById(id);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);
    return decryptAccount(account);
  },

  /**
   * Connect a new OAuth account. If the user already owns this (platform, accountId),
   * just link the workspace(s) to the existing account instead of creating a duplicate.
   */
  connectPlatformAccount: async (data: ICreatePlatformAccountData, userId: string): Promise<IPlatformAccount> => {
    const { error } = validate(ConnectPlatformAccountSchema, data);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    // Verify MANAGE_ACCOUNTS permission in every workspace being linked
    for (const wsId of data.workspaceIds) {
      await requirePermission(wsId, userId, Permission.MANAGE_ACCOUNTS);
    }

    // Check if user already owns this social account
    const existing = await platformAccountRepository.findByUserAndPlatformAccount(
      userId, data.platform, data.accountId,
    );

    if (existing) {
      // Already owned — just link the workspace(s)
      for (const wsId of data.workspaceIds) {
        await platformAccountRepository.addWorkspace(existing._id!, wsId);
      }
      const updated = await platformAccountRepository.findById(existing._id!);
      return updated!;
    }

    // New account — encrypt tokens and create
    const encryptedData = { ...data };
    encryptTokens(encryptedData);
    return platformAccountRepository.create(encryptedData);
  },

  /** Link an existing user-owned account to a workspace. */
  linkToWorkspace: async (platformAccountDocId: string, workspaceId: string, userId: string): Promise<IPlatformAccount> => {
    const { error } = validate(LinkPlatformAccountSchema, { accountId: platformAccountDocId, workspaceId });
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const account = await platformAccountRepository.findById(platformAccountDocId);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);
    if (account.userId !== userId) throw new AppError('FORBIDDEN', PLATFORM_ACCOUNT.NOT_OWNER);

    await requirePermission(workspaceId, userId, Permission.MANAGE_ACCOUNTS);

    if (account.workspaceIds.includes(workspaceId)) {
      throw new AppError('BAD_REQUEST', PLATFORM_ACCOUNT.ALREADY_LINKED);
    }

    const updated = await platformAccountRepository.addWorkspace(platformAccountDocId, workspaceId);
    return updated!;
  },

  /** Unlink an account from a workspace (does NOT delete the account). */
  unlinkFromWorkspace: async (platformAccountDocId: string, workspaceId: string, userId: string): Promise<IPlatformAccount> => {
    const { error } = validate(UnlinkPlatformAccountSchema, { accountId: platformAccountDocId, workspaceId });
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const account = await platformAccountRepository.findById(platformAccountDocId);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);

    // Either the account owner or a workspace manager/admin may unlink
    if (account.userId !== userId) {
      await requirePermission(workspaceId, userId, Permission.MANAGE_ACCOUNTS);
    }

    if (!account.workspaceIds.includes(workspaceId)) {
      throw new AppError('BAD_REQUEST', PLATFORM_ACCOUNT.NOT_LINKED);
    }

    const updated = await platformAccountRepository.removeWorkspace(platformAccountDocId, workspaceId);
    return updated!;
  },

  /** Owner can update account display details or tokens. */
  updatePlatformAccount: async (id: string, data: IUpdatePlatformAccountData, userId: string): Promise<IPlatformAccount> => {
    const account = await platformAccountRepository.findById(id);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);

    if (account.userId !== userId) {
      throw new AppError('FORBIDDEN', PLATFORM_ACCOUNT.NOT_OWNER);
    }

    const encryptedData = { ...data };
    encryptTokens(encryptedData);

    const updated = await platformAccountRepository.update(id, encryptedData);
    return updated!;
  },

  /** Refresh token if it's expired or about to expire (within 5 min). Internal use. */
  refreshTokenIfNeeded: async (id: string): Promise<IPlatformAccount> => {
    const account = await platformAccountRepository.findById(id);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);

    if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      const tokenRefreshService = (await import('./tokenRefresh.service')).default;
      await tokenRefreshService.refreshTokens(id);
      const refreshed = await platformAccountRepository.findById(id);
      return decryptAccount(refreshed!);
    }

    return decryptAccount(account);
  },

  /** Owner can fully revoke/disconnect (soft-delete) a platform account. */
  disconnectPlatformAccount: async (id: string, userId: string): Promise<IPlatformAccount> => {
    const account = await platformAccountRepository.findById(id);
    if (!account) throw new AppError('NOT_FOUND', PLATFORM_ACCOUNT.NOT_FOUND);

    if (account.userId !== userId) {
      throw new AppError('FORBIDDEN', PLATFORM_ACCOUNT.NOT_OWNER);
    }

    const deleted = await platformAccountRepository.softDelete(id);
    return deleted!;
  },
};

export default platformAccountService;
