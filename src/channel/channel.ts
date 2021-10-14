import {
  ChannelOptions,
  ClientInterface,
  CreateLogStreamPayload,
  LogStreamNameResolver,
  NonEmptyString,
  PutLogEventsPayload,
} from '../types';
import { InputLogEvent } from '@aws-sdk/client-cloudwatch-logs';

export class Channel<N extends string = string> {
  readonly client: ClientInterface;
  readonly logGroupName: string;
  readonly logStreamNameResolver: LogStreamNameResolver;
  readonly interval: number;

  constructor(readonly name: NonEmptyString<N>, options: ChannelOptions) {
    this.client = options.client;
    this.logGroupName = options.logGroupName;
    this.logStreamNameResolver = options.logStreamNameResolver;
    this.interval = options.interval;
  }

  async createPutLogEventsPayload(
    events: readonly InputLogEvent[],
    sequenceToken?: string | null
  ): Promise<PutLogEventsPayload> {
    return {
      logGroupName: this.logGroupName,
      logStreamName: await this.logStreamNameResolver(),
      logEvents: events,
      ...(sequenceToken ? { sequenceToken } : undefined),
    };
  }

  async createCreateLogStreamPayload(): Promise<CreateLogStreamPayload> {
    return {
      logGroupName: this.logGroupName,
      logStreamName: await this.logStreamNameResolver(),
    };
  }
}
