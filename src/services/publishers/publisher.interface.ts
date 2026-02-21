import { IPlatformAccount } from '../../interfaces/platformAccount.interface';
import { IPostContent } from '../../interfaces/platform.interface';

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export interface IPublisher {
  publish(account: IPlatformAccount, content: IPostContent): Promise<PublishResult>;
}
