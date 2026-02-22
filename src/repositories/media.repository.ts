import { IMedia } from '../interfaces/media.interface';
import Media from '../models/media.model';

const mediaRepository = {
  create: (data: Partial<IMedia>): Promise<IMedia> =>
    Media.create(data),

  findById: (id: string): Promise<IMedia | null> =>
    Media.findById(id),

  findByIds: (ids: string[]): Promise<IMedia[]> =>
    Media.find({ _id: { $in: ids } }),

  deleteById: (id: string): Promise<IMedia | null> =>
    Media.findByIdAndDelete(id),
};

export default mediaRepository;
