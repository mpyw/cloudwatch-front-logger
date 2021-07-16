import { ConsoleInterface, ConsoleListener, Level } from './types';
import { SourceCollection } from './source';
import { ConsoleMessage, CustomMessage, ErrorEventMessage } from './message';

export class Handler {
  constructor(
    protected readonly originalConsole: ConsoleInterface,
    protected readonly sources: SourceCollection
  ) {}

  readonly debug: ConsoleListener = (message, ...args) =>
    this.consoleCall('debug', message, ...args);
  readonly info: ConsoleListener = (message, ...args) =>
    this.consoleCall('info', message, ...args);
  readonly log: ConsoleListener = (message, ...args) =>
    this.consoleCall('log', message, ...args);
  readonly warn: ConsoleListener = (message, ...args) =>
    this.consoleCall('warn', message, ...args);
  readonly error: ConsoleListener = (message, ...args) =>
    this.consoleCall('error', message, ...args);

  readonly uncaught = async (event: ErrorEvent): Promise<void> => {
    return this.sources
      .filterByLevel('error')
      .push(new ErrorEventMessage(event));
  };

  readonly notify = async (
    level: Level,
    error: unknown,
    ...params: readonly unknown[]
  ): Promise<void> => {
    const sources = this.sources.filterByLevel(level);
    await sources.push(new CustomMessage(error, params));
  };

  protected async consoleCall(
    level: Level,
    message: unknown,
    ...params: readonly unknown[]
  ): Promise<void> {
    const sources = this.sources.filterByLevel(level);

    if (!sources.muted) {
      this.originalConsole[level](message, ...params);
    }

    await sources.push(new ConsoleMessage(level, message, params));
  }
}
