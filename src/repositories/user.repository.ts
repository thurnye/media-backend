import { ICreateUserData, IPaginatedResult, IPaginationArgs, IUpdateUserInput, IUser } from '../interfaces/user.interface';
import User from '../models/user.model';

const userRepository = {
  findAll: async ({ page = 1, limit = 10 }: IPaginationArgs = {}): Promise<IPaginatedResult<IUser>> => {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      User.find().skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string): Promise<IUser | null> =>
    User.findById(id),

  findByEmail: (email: string): Promise<IUser | null> =>
    User.findOne({ email }),

  findByIds: (ids: string[]): Promise<IUser[]> =>
    User.find({ _id: { $in: ids } }),

  create: (data: ICreateUserData): Promise<IUser> =>
    User.create(data),

  update: (id: string, fields: IUpdateUserInput): Promise<IUser | null> =>
    User.findByIdAndUpdate(id, { $set: fields }, { new: true }),

  saveToken: (id: string, token: string | null): Promise<IUser | null> =>
    User.findByIdAndUpdate(id, { $set: { token } }, { new: true }),

  findByEmailVerificationHash: (hash: string): Promise<IUser | null> =>
    User.findOne({ emailVerificationTokenHash: hash }),

  findByPasswordResetHash: (hash: string): Promise<IUser | null> =>
    User.findOne({ passwordResetTokenHash: hash }),

  addWorkspace: (
    userId: string,
    entry: { workspaceId: string; role: string; joinedAt: Date },
  ): Promise<IUser | null> =>
    User.findByIdAndUpdate(
      userId,
      { $push: { workspaces: entry } },
      { new: true },
    ),
};

export default userRepository;
