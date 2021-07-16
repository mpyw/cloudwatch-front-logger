import { Source, SourceCollection } from '../source';
import { Channel } from '../channel';
import { Collector } from './collector';

export class CollectorFactory {
  createCollector(
    channel: Channel,
    sources: Source | readonly Source[] | SourceCollection
  ): Collector {
    return new Collector(channel, SourceCollection.wrap(sources));
  }
}
