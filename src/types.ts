import {
  CloudWatchLogsClient,
  InputLogEvent,
} from '@aws-sdk/client-cloudwatch-logs';
import { ChannelFactory } from './channel';
import { SourceFactory } from './source';
import { CollectorFactory } from './collector';
import { Installer } from './installer';

// Utilities
export type NonEmptyString<T extends string> = T extends '' ? never : T;
export type RequiredOnly<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type KeyOfType<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];
type RequiredKeys<T> = {
  [K in keyof T]-?: Record<any, unknown> extends Pick<T, K> ? never : K;
}[keyof T];
type MissingKeys<Req, Passed extends Partial<Req>> = {
  [K in keyof Pick<Req, RequiredKeys<Req>>]: Passed[K] extends Req[K]
    ? never
    : K;
}[keyof Pick<Req, RequiredKeys<Req>>];
export type RequireMissingSubset<Req, Passed extends Partial<Req>> = Pick<
  Req,
  MissingKeys<Req, Passed>
> &
  Partial<Omit<Req, MissingKeys<Req, Passed>>>;
export type RequireMissing<Req, Passed extends Partial<Req>> = Record<
  any,
  unknown
> extends RequireMissingSubset<Req, Passed>
  ? [options?: RequireMissingSubset<Req, Passed>]
  : [options: RequireMissingSubset<Req, Passed>];
export type Exact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

// Valid error levels
export type Level = 'debug' | 'info' | 'log' | 'warn' | 'error';

// Environment
export interface EnvironmentalOptions {
  readonly storage?: StorageInterface;
  readonly console?: ConsoleInterface;
  readonly setInterval?: typeof setInterval;
  readonly clearInterval?: typeof clearInterval;
  readonly setTimeout?: typeof setTimeout;
  readonly eventTarget?: EventTarget;
}

// Source and its factory options
export type SourceOptions = {
  readonly level: Level;
  readonly messageFormatter: MessageFormatter;
  readonly muted: boolean;
  readonly disabled: boolean;
  readonly timestampProvider: () => number;
};
export type SourceFactoryOptions = Partial<SourceOptions>;
export type CreateSourceOptions = RequiredOnly<Partial<SourceOptions>, 'level'>;
export type CreateSourceOptionsWithoutLevel = Omit<
  CreateSourceOptions,
  'level'
>;

// Channel and its factory options
export type ChannelFactoryOptions = {
  readonly client: ClientInterface;
  readonly logGroupName: string;
  readonly logStreamNameResolver?: LogStreamNameResolver;
  readonly interval?: number;
};
export type ChannelOptions = Required<ChannelFactoryOptions>;

// Resolve logStreamName for current user (e.g. Canvas Fingerprint)
export interface LogStreamNameResolver {
  (): string | Promise<string>;
}

// Message Formatting
export interface Message<T extends string = string, E = unknown> {
  readonly type: T;
  readonly error: E;
  toJSON(): JsonMessage<T>;
}
export interface MessageFormatter {
  (message: Message): string | null | Promise<string | null>;
}
export type JsonMessage<
  T extends 'console' | 'uncaught' | 'custom' | string,
  F = unknown
> = {
  readonly type: T;
  readonly message: string;
} & F;

// window.Console compatible interface
export interface ConsoleListener {
  (
    message?: unknown,
    ...optionalParams: readonly unknown[]
  ): void | Promise<void>;
}
export interface ConsoleInterface {
  debug: ConsoleListener;
  info: ConsoleListener;
  log: ConsoleListener;
  warn: ConsoleListener;
  error: ConsoleListener;
}

// window.localStorage and ReactNative's AsyncStorage compatible interface
export interface StorageInterface {
  getItem(key: string): string | null | Promise<string | null>;
  removeItem(key: string): void | Promise<void>;
  setItem(key: string, value: string): void | Promise<void>;
}

// AWS CloudWatchLogs Client compatible interface
export interface ClientInterface {
  readonly send: CloudWatchLogsClient['send'];
}
export type PutLogEventsPayload = {
  readonly logEvents: readonly InputLogEvent[];
  readonly logGroupName: string;
  readonly logStreamName: string;
};
export type CreateLogStreamPayload = {
  readonly logGroupName: string;
  readonly logStreamName: string;
};
export interface AWSError extends Error {
  readonly name: string;
  readonly message: string;
  readonly expectedSequenceToken?: string;
}
export interface StreamAlreadyExistsError extends AWSError {
  readonly name: 'ResourceAlreadyExistsException';
}
export interface UnrecoverableSequenceTokenError extends AWSError {
  readonly expectedSequenceToken: undefined;
}

// Factory Helper
export interface FactoryHelper<C extends Partial<ChannelFactoryOptions>> {
  readonly install: Installer['install'];
  readonly createChannel: ChannelFactory<C>['createChannel'];
  readonly createSource: SourceFactory['createSource'];
  readonly createSources: SourceFactory['createSources'];
  readonly createCollector: CollectorFactory['createCollector'];
}
