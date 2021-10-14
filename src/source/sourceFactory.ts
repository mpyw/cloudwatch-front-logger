import {
  CreateSourceOptions,
  CreateSourceOptionsWithoutLevel,
  Level,
  MessageFormatter,
  SourceFactoryOptions,
} from '../types';
import { Source } from './source';
import { SourceCollection } from './sourceCollection';

export class SourceFactory {
  protected readonly messageFormatter: MessageFormatter;
  protected readonly muted: boolean;
  protected readonly disabled: boolean;
  protected readonly timestampProvider: () => number;

  constructor(options?: SourceFactoryOptions) {
    this.messageFormatter =
      options?.messageFormatter ?? ((message) => JSON.stringify(message));
    this.muted = options?.muted ?? false;
    this.disabled = options?.disabled ?? false;
    this.timestampProvider =
      options?.timestampProvider ?? (() => new Date().getTime());
  }

  createSource(options: CreateSourceOptions): Source;
  createSource(level: Level, options?: CreateSourceOptionsWithoutLevel): Source;
  createSource(
    first: Level | CreateSourceOptions,
    second?: CreateSourceOptionsWithoutLevel
  ): Source {
    const [level, options] =
      typeof first === 'string' ? [first, second] : [first.level, first];

    return new Source({
      level,
      messageFormatter: options?.messageFormatter ?? this.messageFormatter,
      muted: options?.muted ?? this.muted,
      disabled: options?.disabled ?? this.disabled,
      timestampProvider: options?.timestampProvider ?? this.timestampProvider,
    });
  }

  createSources(
    levels: readonly Level[],
    options?: CreateSourceOptionsWithoutLevel
  ): SourceCollection {
    return SourceCollection.wrap(
      levels.map((level) => this.createSource(level, options))
    );
  }
}
