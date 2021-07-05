import { StorageInterface } from './types';

export class Cache {
  constructor(
    protected readonly storage: StorageInterface | Cache,
    protected readonly namespace: string
  ) {}

  async setItem(key: string, value: string): Promise<void> {
    return this.storage.setItem(`${this.namespace}:${key}`, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.storage.getItem(`${this.namespace}:${key}`);
  }

  async removeItem(...keys: readonly string[]): Promise<void> {
    await Promise.all(
      keys.map((key) => this.storage.removeItem(`${this.namespace}:${key}`))
    );
  }
}
