import { Sender } from '../sender';
import { InstalledEnvironment } from '../environment';
import { Collector } from '../collector';
import { Cache } from '../cache';

export class Worker {
  protected readonly sender: Sender;
  protected interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    protected readonly environment: InstalledEnvironment,
    readonly collector: Collector
  ) {
    this.sender = new Sender(
      this.environment,
      collector.channel,
      new Cache(
        this.environment.storage,
        `CloudWatchFrontLogger:${collector.channelName}`
      )
    );
  }

  get running(): boolean {
    return this.interval !== null;
  }

  start(): void {
    if (!this.interval) {
      this.interval = this.environment.setInterval(
        () => this.tick(),
        this.collector.channel.interval
      );
    }
  }

  stop(): void {
    if (this.interval) {
      this.environment.clearInterval(this.interval);
    }
  }

  async tick(): Promise<void> {
    await this.collector.collect(this.sender);
  }
}
