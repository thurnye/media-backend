import {
  ICreatePostData,
  IPostListArgs,
  IPost,
  IUpdatePostData,
} from '../interfaces/post.interface';
import {
  IPaginatedResult,
} from '../interfaces/user.interface';
import Post from '../models/post.model';

class PostRepository {
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  create(data: ICreatePostData): Promise<IPost> {
    return Post.create(data);
  }

  async findAll(
    {
      page = 1,
      limit = 10,
      workspaceId,
      search,
      status,
      category,
      priority,
      isEvergreen,
      sortBy = 'newest',
      createdBy,
    }: IPostListArgs,
  ): Promise<IPaginatedResult<IPost>> {
    const filter: Record<string, unknown> = { deletedAt: null, isActive: true };
    if (workspaceId) filter.workspaceId = workspaceId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (typeof isEvergreen === 'boolean') filter.isEvergreen = isEvergreen;
    if (createdBy?.trim()) {
      filter.createdBy = { $regex: this.escapeRegex(createdBy.trim()), $options: 'i' };
    }
    if (search?.trim()) {
      const escaped = this.escapeRegex(search.trim());
      const regex = { $regex: escaped, $options: 'i' };
      filter.$or = [{ title: regex }, { description: regex }, { tags: regex }, { createdBy: regex }];
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      updated_desc: { updatedAt: -1 },
      updated_asc: { updatedAt: 1 },
      title_asc: { title: 1 },
      title_desc: { title: -1 },
      priority_desc: { priority: -1, createdAt: -1 },
      priority_asc: { priority: 1, createdAt: -1 },
    };
    const sort = sortMap[sortBy] ?? sortMap.newest;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Post.find(filter).sort(sort).skip(skip).limit(limit),
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

  findEvergreenReady(before: Date): Promise<IPost[]> {
    return Post.find({
      isActive: true,
      deletedAt: null,
      isEvergreen: true,
      'recycleSettings.enabled': true,
      'recycleSettings.nextRecycleAt': { $lte: before },
      $expr: { $lt: ['$repostCount', '$recycleSettings.maxRepeats'] },
    });
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
