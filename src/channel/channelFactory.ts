import {
  ChannelFactoryOptions,
  ClientInterface,
  Exact,
  LogStreamNameResolver,
  NonEmptyString,
  RequireMissing,
} from '../types';
import { Channel } from './channel';

export class ChannelFactory<O extends Partial<ChannelFactoryOptions>> {
  protected readonly client: ClientInterface | null;
  protected readonly logGroupName: string | null;
  protected readonly logStreamNameResolver: LogStreamNameResolver;
  protected readonly interval: number;

  // Any essential parameters can be omitted in constructor.
  constructor(options?: Exact<O, Partial<ChannelFactoryOptions>>) {
    this.client = options?.client ?? null;
    this.logGroupName = options?.logGroupName ?? null;
    this.logStreamNameResolver =
      options?.logStreamNameResolver ?? (() => 'anonymous');
    this.interval = options?.interval ?? 3000;
  }

  // Omitted parameters in constructor must be passed here.
  createChannel<N extends string>(
    name: NonEmptyString<N>,
    ...args: RequireMissing<ChannelFactoryOptions, O>
  ): Channel;
  createChannel(
    name: string,
    options?: Partial<ChannelFactoryOptions>
  ): Channel {
    const client = options?.client ?? this.client;
    if (!client) {
      throw new Error('Missing channel config: client');
    }
    const logGroupName = options?.logGroupName ?? this.logGroupName;
    if (!logGroupName) {
      throw new Error('Missing channel config: logGroupName');
    }
    return new Channel(name, {
      client,
      logGroupName,
      logStreamNameResolver:
        options?.logStreamNameResolver ?? this.logStreamNameResolver,
      interval: options?.interval ?? this.interval,
    });
  }
}
