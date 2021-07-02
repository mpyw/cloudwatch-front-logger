import {
  CloudWatchLogsClient,
  CloudWatchLogsClientConfig,
} from '@aws-sdk/client-cloudwatch-logs';

// Resolve logStreamName for current user (e.g. Canvas Fingerprint)
export interface LogStreamNameResolver {
  (): string | Promise<string>;
}

// Format message string from Error
export interface MessageFormatter {
  (e: Error, info?: ErrorInfo): string | null | Promise<string | null>;
}
export interface ErrorInfo {
  [key: string]: any;
}

// Options for Logger.prototype.install()
export interface InstallOptions {
  logStreamNameResolver?: LogStreamNameResolver;
  messageFormatter?: MessageFormatter;
  ClientConstructor?: ClientConstructor;
  storage?: StorageInterface;
  console?: ConsoleInterface;
  eventTarget?: EventTarget;
}

// Valid Error Levels
export type Level = 'debug' | 'info' | 'log' | 'warn' | 'error';

// window.Console compatible interface
export interface ConsoleInterface {
  debug(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
}

// window.localStorage and ReactNative's AsyncStorage compatible interface
export interface StorageInterface {
  getItem(key: string): string | null | Promise<string | null>;
  removeItem(key: string): void | Promise<void>;
  setItem(key: string, value: string): void | Promise<void>;
}

// AWS CloudWatchLogs Client compatible interface
export interface ClientConstructor {
  new (options: CloudWatchLogsClientConfig): ClientInterface;
}
export interface ClientInterface {
  send: CloudWatchLogsClient['send'];
}

export interface AWSError extends Error {
  name: string;
  message: string;
  expectedSequenceToken?: string;
}
