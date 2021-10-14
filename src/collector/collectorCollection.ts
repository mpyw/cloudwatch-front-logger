import { Collector } from './collector';
import { wrapAsArray } from '../util';
import { Collection } from '../collection';
import { Source, SourceCollection } from '../source';
import { ChannelCollection } from '../channel';

export class CollectorCollection extends Collection<Collector> {
  static wrap(
    collectors:
      | Collector
      | readonly Collector[]
      | Collection<Collector>
      | CollectorCollection
  ): CollectorCollection {
    return collectors instanceof CollectorCollection
      ? collectors
      : new CollectorCollection(
          collectors instanceof Collection
            ? collectors.items
            : wrapAsArray(collectors)
        );
  }

  constructor(readonly items: readonly Collector[]) {
    super('Collector', items);
  }

  get channels(): ChannelCollection {
    return ChannelCollection.wrap(
      this.items.map((collector) => collector.channel)
    );
  }

  get sources(): SourceCollection {
    return SourceCollection.wrap(
      ([] as readonly Source[]).concat(
        ...this.items.map((collector) => collector.sources.items)
      )
    );
  }

  filterByChannelNamePrefix(
    namePrefix: string | readonly string[]
  ): CollectorCollection {
    return CollectorCollection.wrap(
      this.filterByPrefix('channelName', namePrefix)
    );
  }

  findByChannelName(name: string): Collector | undefined {
    return this.findBy('channelName', name);
  }
}
