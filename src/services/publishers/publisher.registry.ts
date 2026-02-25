import { PlatformType } from '../../config/enums/platform.enums';
import { IPublisher } from './publisher.interface';
import facebookPublisher from './facebook.publisher';
import instagramPublisher from './instagram.publisher';
import linkedInPublisher from './linkedin.publisher';
import tikTokPublisher from './tiktok.publisher';
import twitterPublisher from './twitter.publisher';
import youtubePublisher from './youtube.publisher';
import mockPublisher from './mock.publisher';

const publisherRegistry: Record<PlatformType, IPublisher> = {
  [PlatformType.FACEBOOK]: facebookPublisher,
  [PlatformType.INSTAGRAM]: instagramPublisher,
  [PlatformType.TWITTER]: twitterPublisher,
  [PlatformType.LINKEDIN]: linkedInPublisher,
  [PlatformType.TIKTOK]: tikTokPublisher,
  [PlatformType.YOUTUBE]: youtubePublisher,
};

export function getPublisher(platform: PlatformType): IPublisher {
  return publisherRegistry[platform] ?? mockPublisher;
}

export default publisherRegistry;

