import { wrapAsArray } from './util';
import { KeyOfType } from './types';

export class Collection<T> {
  constructor(readonly type: string, readonly items: readonly T[]) {}

  protected filterBy<B extends keyof T>(
    by: B,
    values: T[B] | readonly T[B][]
  ): Collection<T> {
    const search = wrapAsArray(values);
    return new Collection<T>(
      this.type,
      this.items.filter((item) => search.includes(item[by]))
    );
  }

  protected filterByPrefix<B extends KeyOfType<T, string>>(
    by: B,
    values: string | readonly string[]
  ): Collection<T> {
    const search = wrapAsArray(values);
    return new Collection<T>(
      this.type,
      this.items.filter((item) =>
        search.some((prefix) => {
          const value = item[by];
          return (
            typeof value === 'string' && (value as string).startsWith(prefix)
          );
        })
      )
    );
  }

  protected findBy<B extends keyof T>(by: B, value: T[B]): T | undefined {
    return this.filterBy(by, value).items[0];
  }
}
