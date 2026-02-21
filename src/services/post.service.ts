import { ICreatePostData, IPost, IUpdatePostData } from '../interfaces/post.interface';
import { IPaginatedResult, IPaginationArgs } from '../interfaces/user.interface';
import postRepository from '../repositories/post.repository';
import { WorkspaceRole } from '../config/enums/workspace.enums';
import { Permission } from '../config/enums/permission.enums';
import { requirePermission, requireMembership } from '../utils/rbac';
import { AppError } from '../errors/AppError';
import { GLOBAL_CONSTANTS } from '../config/constants/globalConstants';
import { CreatePostSchema, UpdatePostSchema, validate } from '../validation/schemas';

const { POST } = GLOBAL_CONSTANTS.ERROR_MESSAGE;

const postService = {
  /** Any workspace member can list posts. */
  getPosts: async (
    args: IPaginationArgs & { workspaceId: string },
    userId: string,
  ): Promise<IPaginatedResult<IPost>> => {
    await requireMembership(args.workspaceId, userId);
    return postRepository.findAll(args, args.workspaceId);
  },

  /** Any workspace member can read a single post. */
  getPostById: async (id: string, userId: string): Promise<IPost> => {
    const post = await postRepository.findById(id);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requireMembership(post.workspaceId, userId);
    return post;
  },

  /** ADMIN and MANAGER can create posts. */
  createPost: async (data: ICreatePostData, userId: string): Promise<IPost> => {
    const { error } = validate(CreatePostSchema, data);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    await requirePermission(data.workspaceId, userId, Permission.CREATE_POST);

    return postRepository.create({ ...data, createdBy: userId });
  },

  /**
   * ADMIN and MANAGER can update posts.
   * MANAGER may only update posts they created.
   */
  updatePost: async (id: string, data: IUpdatePostData, userId: string): Promise<IPost> => {
    const { error } = validate(UpdatePostSchema, data);
    if (error) throw new AppError('VALIDATION_ERROR', error);

    const post = await postRepository.findById(id);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    const role = await requirePermission(post.workspaceId, userId, Permission.UPDATE_POST);

    if (role === WorkspaceRole.MANAGER && post.createdBy.toString() !== userId) {
      throw new AppError('FORBIDDEN', POST.NOT_OWNER);
    }

    const updated = await postRepository.update(id, data);
    return updated!;
  },

  /** Only ADMIN can delete posts. */
  deletePost: async (id: string, userId: string): Promise<IPost> => {
    const post = await postRepository.findById(id);
    if (!post) throw new AppError('NOT_FOUND', POST.POST_NOT_FOUND);

    await requirePermission(post.workspaceId, userId, Permission.DELETE_POST);

    const deleted = await postRepository.delete(id);
    return deleted!;
  },
};

export default postService;
