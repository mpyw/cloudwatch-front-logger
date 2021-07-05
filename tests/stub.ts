import {
  StorageInterface,
  ConsoleInterface,
  Level,
  AWSError,
  ClientInterface,
} from '../src/';
import {
  CreateLogStreamCommand,
  PutLogEventsCommandOutput,
  PutLogEventsCommand,
  CreateLogStreamCommandOutput,
} from '@aws-sdk/client-cloudwatch-logs';

export class DummyStorage implements StorageInterface {
  storage: { [key: string]: string } = {};
  getItem(key: string): string | null {
    return this.storage[key] || null;
  }
  removeItem(key: string): void {
    delete this.storage[key];
  }
  setItem(key: string, value: string): void {
    this.storage[key] = value;
  }
}

export interface DummyConsoleMessage {
  message: unknown;
  level: Level;
}

export class DummyConsole implements ConsoleInterface {
  messages: DummyConsoleMessage[] = [];
  debug(message?: unknown): void {
    this.messages.push({ message, level: 'debug' });
  }
  info(message?: unknown): void {
    this.messages.push({ message, level: 'info' });
  }
  log(message?: unknown): void {
    this.messages.push({ message, level: 'log' });
  }
  error(message?: unknown): void {
    this.messages.push({ message, level: 'error' });
  }
  warn(message?: unknown): void {
    this.messages.push({ message, level: 'warn' });
  }
}

export class DummyClient implements ClientInterface {
  sink: { [key: string]: any[] } = {};
  sequenceToken: string | null = null;

  async send(
    command: CreateLogStreamCommand
  ): Promise<CreateLogStreamCommandOutput>;
  async send(command: PutLogEventsCommand): Promise<PutLogEventsCommandOutput>;
  async send(
    command: CreateLogStreamCommand | PutLogEventsCommand
  ): Promise<CreateLogStreamCommandOutput | PutLogEventsCommandOutput> {
    if (command instanceof CreateLogStreamCommand) {
      this.sink[
        `${command.input.logGroupName}/${command.input.logStreamName}`
      ] = [];
      return { $metadata: {} };
    }

    if (command instanceof PutLogEventsCommand) {
      this.sink[
        `${command.input.logGroupName}/${command.input.logStreamName}`
      ].push(...(command.input.logEvents ?? []));
      this.sequenceToken = `${
        command.input.sequenceToken || `SEQUENCE_TOKEN_`
      }#`;
      return { nextSequenceToken: this.sequenceToken, $metadata: {} };
    }

    throw new Error('Unsupported stub command');
  }
}

export class DummyEventTarget implements EventTarget {
  listeners: { [key: string]: EventListener } = {};

  addEventListener(type: string, listener: EventListener): void {
    this.listeners[type] = listener;
  }

  dispatchEvent(): boolean {
    return false;
  }

  removeEventListener(type: string): void {
    delete this.listeners[type];
  }
}

export class DummyAWSError extends Error implements AWSError {
  constructor(
    message: string,
    public name: string,
    public expectedSequenceToken?: string
  ) {
    super(message);
  }
}
