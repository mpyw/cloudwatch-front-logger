import {
  StorageInterface,
  ConsoleInterface,
  Level,
  AWSError,
  ClientInterface
} from "../src/types";
import {
  CreateLogStreamRequest,
  PutLogEventsCommandOutput,
  PutLogEventsRequest
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

  public async createLogStream(params: CreateLogStreamRequest): Promise<any> {
    this.sink[`${params.logGroupName}/${params.logStreamName}`] = [];
    return {};
  }

  public async putLogEvents(
    params: PutLogEventsRequest
  ): Promise<PutLogEventsCommandOutput> {
    this.sink[`${params.logGroupName}/${params.logStreamName}`].push(
      ...(params.logEvents ?? [])
    );
    this.sequenceToken = `${params.sequenceToken || `SEQUENCE_TOKEN_`}#`;
    return { nextSequenceToken: this.sequenceToken, $metadata: {} };
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
