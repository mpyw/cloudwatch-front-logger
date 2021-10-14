import { Level, Message, MessageFormatter, SourceOptions } from '../types';
import { EventSink } from './eventSink';
import { InputLogEvent } from '@aws-sdk/client-cloudwatch-logs';

export class Source {
  readonly level: Level;
  readonly messageFormatter: MessageFormatter;
  protected _events: EventSink;
  protected _muted: boolean;
  protected _disabled: boolean;

  constructor(options: SourceOptions) {
    this.level = options.level;
    this.messageFormatter = options.messageFormatter;
    this._muted = options.muted;
    this._disabled = options.disabled;
    this._events = new EventSink(this, options.timestampProvider);
  }

  get muted(): boolean {
    return this._muted;
  }

  get disabled(): boolean {
    return this._disabled;
  }

  get events(): EventSink['events'] {
    return this._events.events;
  }

  mute(): this {
    this._muted = true;
    return this;
  }

  unmute(): this {
    this._muted = false;
    return this;
  }

  enable(): this {
    this._disabled = false;
    return this;
  }

  disable(): this {
    this._disabled = true;
    return this;
  }

  async push(...messages: readonly Message[]): Promise<void> {
    return this._events.push(...messages);
  }

  flush(): InputLogEvent[] {
    return this._events.flush();
  }
}
