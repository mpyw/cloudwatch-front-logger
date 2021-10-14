import { SourceCollection } from '../source';
import { Channel } from '../channel';
import { Sender } from '../sender';

export class Collector {
  constructor(readonly channel: Channel, readonly sources: SourceCollection) {}

  get channelName(): string {
    return this.channel.name;
  }

  async collect(sender: Sender): Promise<void> {
    return sender.send(this.sources.flush());
  }
}
