import { Channel } from './channel';
import { wrapAsArray } from '../util';
import { Collection } from '../collection';

export class ChannelCollection extends Collection<Channel> {
  static wrap(
    channels:
      | Channel
      | readonly Channel[]
      | Collection<Channel>
      | ChannelCollection
  ): ChannelCollection {
    return channels instanceof ChannelCollection
      ? channels
      : new ChannelCollection(
          channels instanceof Collection
            ? channels.items
            : wrapAsArray(channels)
        );
  }

  constructor(readonly items: readonly Channel[]) {
    super('Channel', items);
  }

  filterByNamePrefix(
    namePrefix: string | readonly string[]
  ): ChannelCollection {
    return ChannelCollection.wrap(this.filterByPrefix('name', namePrefix));
  }

  filterByLogGroupName(
    logGroupName: string | readonly string[]
  ): ChannelCollection {
    return ChannelCollection.wrap(this.filterBy('logGroupName', logGroupName));
  }

  findByName(name: string): Channel | undefined {
    return this.findBy('name', name);
  }

  findByLogGroupName(logGroupName: string): Channel | undefined {
    return this.findBy('logGroupName', logGroupName);
  }
}
