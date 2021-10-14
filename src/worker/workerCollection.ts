import { Worker } from './worker';
import { wrapAsArray } from '../util';
import { Collection } from '../collection';
import { CollectorCollection } from '../collector';
import { ChannelCollection } from '../channel';
import { SourceCollection } from '../source';

export class WorkerCollection extends Collection<Worker> {
  static wrap(
    workers: Worker | readonly Worker[] | Collection<Worker> | WorkerCollection
  ): WorkerCollection {
    return workers instanceof WorkerCollection
      ? workers
      : new WorkerCollection(
          workers instanceof Collection ? workers.items : wrapAsArray(workers)
        );
  }

  constructor(readonly items: readonly Worker[]) {
    super('Worker', items);
  }

  get collectors(): CollectorCollection {
    return CollectorCollection.wrap(
      this.items.map((worker) => worker.collector)
    );
  }

  get channels(): ChannelCollection {
    return this.collectors.channels;
  }

  get sources(): SourceCollection {
    return this.collectors.sources;
  }

  protected action<A extends 'start' | 'stop'>(action: A): this {
    this.items.forEach((channel) => channel[action]());
    return this;
  }

  start(): void {
    this.action('start');
  }

  stop(): void {
    this.action('stop');
  }
}
