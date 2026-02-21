import {
  ICreatePostData,
  IPost,
  IUpdatePostData,
} from '../interfaces/post.interface';
import {
  IPaginatedResult,
  IPaginationArgs,
} from '../interfaces/user.interface';
import Post from '../models/post.model';

class PostRepository {
  create(data: ICreatePostData): Promise<IPost> {
    return Post.create(data);
  }

  async findAll(
    { page = 1, limit = 10 }: IPaginationArgs = {},
    workspaceId?: string,
  ): Promise<IPaginatedResult<IPost>> {
    const filter: Record<string, unknown> = { deletedAt: null, isActive: true };
    if (workspaceId) filter.workspaceId = workspaceId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Post.find(filter).skip(skip).limit(limit),
      Post.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  findById(id: string): Promise<IPost | null> {
    return Post.findOne({ _id: id, deletedAt: null });
  }

  update(id: string, data: IUpdatePostData): Promise<IPost | null> {
    return Post.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: data },
      { new: true },
    );
  }

  delete(id: string): Promise<IPost | null> {
    return Post.findByIdAndUpdate(
      id,
      {
        $set: {
          deletedAt: new Date(),
          isActive: false,
        },
      },
      { new: true },
    );
  }
}

export default new PostRepository();
