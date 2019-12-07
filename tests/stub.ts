import CloudWatchLogs, { SequenceToken } from "aws-sdk/clients/cloudwatchlogs";
import {
  StorageInterface,
  ConsoleInterface,
  ClientInterface,
  Level
} from "../src/types";
import { AWSError } from "aws-sdk";

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
  public sequenceToken: SequenceToken | null = null;

  public createLogStream(
    params: CloudWatchLogs.CreateLogStreamRequest,
    callback?: (err: DummyAWSError, data: {}) => void
  ): any {
    this.sink[`${params.logGroupName}/${params.logStreamName}`] = [];
    callback && callback(undefined as any, {});
  }

  public putLogEvents(
    params: CloudWatchLogs.PutLogEventsRequest,
    callback?: (
      err: DummyAWSError,
      data: CloudWatchLogs.PutLogEventsResponse
    ) => void
  ): any {
    this.sink[`${params.logGroupName}/${params.logStreamName}`].push(
      ...params.logEvents
    );
    this.sequenceToken = `${params.sequenceToken || `SEQUENCE_TOKEN_`}#`;
    callback &&
      callback(undefined as any, { nextSequenceToken: this.sequenceToken });
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
  constructor(message: string, public code: string) {
    super(message);
  }
  public retryable = false;
  public statusCode = 200;
  public time: Date = new Date();
  public hostname = "localhost";
  public region = "ap-northeast-1";
  public retryDelay = 0;
  public requestId = "xxx";
  public extendedRequestId = "xxx";
  public cfId = "xxx";
}
