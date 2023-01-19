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
  public storage: { [key: string]: string } = {};
  public getItem(key: string): string | null {
    return this.storage[key] || null;
  }
  public removeItem(key: string): void {
    delete this.storage[key];
  }
  public setItem(key: string, value: string): void {
    this.storage[key] = value;
  }
}

export interface DummyConsoleMessage {
  message: unknown;
  level: Level;
  args?: any[];
}

export class DummyConsole implements ConsoleInterface {
  public messages: DummyConsoleMessage[] = [];
  public debug(message?: unknown, ...optionalParams: any[]): void {
    const msg: DummyConsoleMessage = { message, level: 'debug' };
    if (optionalParams.length) {
      msg.args = optionalParams;
    }
    this.messages.push(msg);
  }
  public info(message?: unknown, ...optionalParams: any[]): void {
    const msg: DummyConsoleMessage = { message, level: 'info' };
    if (optionalParams.length) {
      msg.args = optionalParams;
    }
    this.messages.push(msg);
  }
  public log(message?: unknown, ...optionalParams: any[]): void {
    const msg: DummyConsoleMessage = { message, level: 'log' };
    if (optionalParams.length) {
      msg.args = optionalParams;
    }
    this.messages.push(msg);
  }
  public error(message?: unknown, ...optionalParams: any[]): void {
    const msg: DummyConsoleMessage = { message, level: 'error' };
    if (optionalParams.length) {
      msg.args = optionalParams;
    }
    this.messages.push(msg);
  }
  public warn(message?: unknown, ...optionalParams: any[]): void {
    const msg: DummyConsoleMessage = { message, level: 'warn' };
    if (optionalParams.length) {
      msg.args = optionalParams;
    }
    this.messages.push(msg);
  }
}

export class DummyClient implements ClientInterface {
  public sink: { [key: string]: any[] } = {};
  public sequenceToken: string | null = null;

  public async send(
    command: CreateLogStreamCommand
  ): Promise<CreateLogStreamCommandOutput>;
  public async send(
    command: PutLogEventsCommand
  ): Promise<PutLogEventsCommandOutput>;
  public async send(
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
  public listeners: { [key: string]: EventListener } = {};

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
