import { JsonMessage, Level, Message } from './types';

export class ConsoleMessage implements Message<'console'> {
  readonly type = 'console' as const;
  constructor(
    readonly level: Level,
    readonly error: unknown,
    readonly params: readonly unknown[]
  ) {}

  toJSON(): JsonMessage<
    'console',
    {
      readonly level: Level;
      readonly params: readonly unknown[];
    }
  > {
    return {
      type: this.type,
      message: formatError(this.error),
      level: this.level,
      params: this.params,
    };
  }
}

export class ErrorEventMessage implements Message<'uncaught', Error> {
  readonly type = 'uncaught' as const;
  readonly error: Error;

  constructor(readonly event: ErrorEvent) {
    this.error = event.error;
  }

  toJSON(): JsonMessage<'uncaught'> {
    return {
      type: this.type,
      message: formatError(this.error),
    };
  }
}

export class CustomMessage<E = unknown, P = readonly unknown[]>
  implements Message<'custom'>
{
  readonly type = 'custom' as const;
  constructor(readonly error: E, readonly params: P) {}

  toJSON(): JsonMessage<'custom', { readonly params: P }> {
    return {
      type: this.type,
      message: formatError(this.error),
      params: this.params,
    };
  }
}

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error}`;
  }
  const castedError = error as unknown as Error;
  if (typeof castedError.message === 'string') {
    return castedError.message;
  }
  return `${error}`;
};
