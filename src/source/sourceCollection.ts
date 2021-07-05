import { Level, Message } from '../types';
import { Collection } from '../collection';
import { Source } from './source';
import { InputLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { wrapAsArray } from '../util';

export class SourceCollection extends Collection<Source> {
  static wrap(
    sources: Source | readonly Source[] | Collection<Source> | SourceCollection
  ): SourceCollection {
    return sources instanceof SourceCollection
      ? sources
      : new SourceCollection(
          sources instanceof Collection ? sources.items : wrapAsArray(sources)
        );
  }

  constructor(readonly items: readonly Source[]) {
    super('Source', items);
  }

  get muted(): boolean {
    return (
      this.items.length > 0 &&
      this.items.length === this.filterBy('muted', true).items.length
    );
  }

  filterByLevel(level: Level | readonly Level[]): SourceCollection {
    return SourceCollection.wrap(this.filterBy('level', level));
  }

  findByLevel(level: Level): Source | undefined {
    return this.findBy('level', level);
  }

  protected action<A extends 'mute' | 'unmute' | 'enable' | 'disable'>(
    action: A
  ): this {
    this.items.forEach((channel) => channel[action]());
    return this;
  }

  mute(): this {
    this.action('mute');
    return this;
  }

  unmute(): this {
    this.action('unmute');
    return this;
  }

  enable(): this {
    this.action('enable');
    return this;
  }

  disable(): this {
    this.action('disable');
    return this;
  }

  async push(...messages: readonly Message[]): Promise<void> {
    await Promise.all(this.items.map((source) => source.push(...messages)));
  }

  flush(): InputLogEvent[] {
    return ([] as readonly InputLogEvent[]).concat(
      ...this.items.map((source) => source.flush())
    );
  }
}
