import PostReviewComment from '../models/postReviewComment.model';
import { IPostReviewComment } from '../interfaces/postReviewComment.interface';

const postReviewCommentRepository = {
  create: (data: IPostReviewComment): Promise<IPostReviewComment> =>
    PostReviewComment.create(data),

  findById: (id: string): Promise<IPostReviewComment | null> =>
    PostReviewComment.findById(id),

  findByPostId: (postId: string): Promise<IPostReviewComment[]> =>
    PostReviewComment.find({ postId }).sort({ createdAt: 1 }),
};

export default postReviewCommentRepository;
