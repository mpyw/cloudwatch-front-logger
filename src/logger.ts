import { Handler } from './handler';
import { InstalledEnvironment } from './environment';
import { WorkerCollection } from './worker';
import { CollectorCollection } from './collector';
import { ChannelCollection } from './channel';
import { SourceCollection } from './source';

export class Logger {
  constructor(
    protected readonly environment: InstalledEnvironment,
    protected readonly handler: Handler,
    readonly workers: WorkerCollection
  ) {}

  get collectors(): CollectorCollection {
    return this.workers.collectors;
  }

  get channels(): ChannelCollection {
    return this.workers.channels;
  }

  get sources(): SourceCollection {
    return this.workers.sources;
  }

  notify(
    ...args: Parameters<Handler['notify']>
  ): ReturnType<Handler['notify']> {
    return this.handler.notify(...args);
  }
}
