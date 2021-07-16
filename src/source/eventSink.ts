import { InputLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { Source } from './index';
import { Message } from '../types';

export class EventSink {
  readonly events: InputLogEvent[];

  constructor(
    protected readonly source: Source,
    protected readonly timestampProvider: () => number
  ) {
    this.events = [];
  }

  async push(...messages: readonly Message[]): Promise<void> {
    if (this.source.disabled) {
      return;
    }
    this.events.push(
      ...(
        await Promise.all(
          messages.map((message) => this.source.messageFormatter(message))
        )
      )
        .filter((x): x is string => Boolean(x))
        .map((text) => ({
          timestamp: this.timestampProvider(),
          message: text,
        }))
    );
  }

  flush(): InputLogEvent[] {
    return this.events.splice(0);
  }
}
