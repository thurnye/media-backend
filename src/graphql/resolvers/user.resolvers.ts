import { IPaginationArgs, ICreateUserInput, IUpdateUserInput } from '../../interfaces/user.interface';
import { IContext, ILoginInput } from '../../interfaces/auth.interface';
import userService from '../../services/user.service';
import authService from '../../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import workspaceRepository from '../../repositories/workspace.repository';

export const userResolvers = {
  User: {
    workspaces: async (parent: any) => {
      const userId = (parent._id ?? parent.id).toString();
      const workspaces = await workspaceRepository.findByUserId(userId);
      return workspaces.map((ws: any) => ({
        workspaceId: ws._id.toString(),
        name:        ws.name,
        role:        ws.members.find((m: any) => m.userId === userId)?.role ?? null,
        joinedAt:    ws.members.find((m: any) => m.userId === userId)?.joinedAt ?? null,
      }));
    },
  },

  Query: {
    getAllUsers: async (_: unknown, args: IPaginationArgs, ctx: IContext) => {
      await requireAuth(ctx);
      return userService.getAllUsers(args);
    },

    user: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      await requireAuth(ctx);
      return userService.getUserById(id);
    },

    me: async (_: unknown, __: unknown, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return userService.getUserById(userId);
    },
  },
  Mutation: {
    createUser: async (_: unknown, args: ICreateUserInput, ctx: IContext) => {
      const { token, user } = await userService.createUser(args);
      if (token) authService.setTokenCookie(ctx.res!, token);
      return { user };
    },

    login: async (_: unknown, args: ILoginInput, ctx: IContext) => {
      const { token, user } = await userService.loginUser(args);
      if (!token) {
        throw new Error('Authentication token was not generated');
      }
      authService.setTokenCookie(ctx.res!, token);
      return { user };
    },

    updateUser: async (_: unknown, args: IUpdateUserInput, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      return userService.updateUser(userId, args);
    },

    deleteUser: async (_: unknown, { id }: { id: string }, ctx: IContext) => {
      await requireAuth(ctx);
      return userService.deleteUser(id);
    },

    logout: async (_: unknown, __: unknown, ctx: IContext) => {
      const userId = await requireAuth(ctx);
      authService.clearTokenCookie(ctx.res!);
      return userService.logoutUser(userId);
    },

    verifyEmail: async (_: unknown, { token }: { token: string }) =>
      userService.verifyEmail(token),

    requestPasswordReset: async (_: unknown, { email }: { email: string }) =>
      userService.requestPasswordReset(email),

    resetPassword: async (
      _: unknown,
      { token, newPassword }: { token: string; newPassword: string },
    ) => userService.resetPassword(token, newPassword),
  },
};
