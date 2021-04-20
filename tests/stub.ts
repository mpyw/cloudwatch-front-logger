import {
  StorageInterface,
  ConsoleInterface,
  Level,
  AWSError,
  ClientInterface
} from "../src/types";
import {
  CreateLogStreamCommand,
  PutLogEventsCommandOutput,
  PutLogEventsCommand,
  CreateLogStreamCommandOutput
} from "@aws-sdk/client-cloudwatch-logs";

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
  message: string;
  level: Level;
}

export class DummyConsole implements ConsoleInterface {
  public messages: DummyConsoleMessage[] = [];
  public debug(message?: any): void {
    this.messages.push({ message, level: "debug" });
  }
  public info(message?: any): void {
    this.messages.push({ message, level: "info" });
  }
  public log(message?: any): void {
    this.messages.push({ message, level: "log" });
  }
  public error(message?: any): void {
    this.messages.push({ message, level: "error" });
  }
  public warn(message?: any): void {
    this.messages.push({ message, level: "warn" });
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
      this.sequenceToken = `${command.input.sequenceToken ||
        `SEQUENCE_TOKEN_`}#`;
      return { nextSequenceToken: this.sequenceToken, $metadata: {} };
    }

    throw new Error("Unsupported stub command");
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
