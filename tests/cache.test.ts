import { Cache } from '../src';
import { DummyStorage } from './stub';

describe('Cache', () => {
  const storage = new DummyStorage();
  const cache = new Cache(storage, 'app');

  it('should set/get/remove item', async () => {
    await cache.setItem('foo', 'bar');
    expect(await cache.getItem('foo')).toBe('bar');
    await cache.removeItem('foo');
    expect(await cache.getItem('foo')).toBe(null);
  });

  it('should remove items at once', async () => {
    await cache.setItem('foo1', 'bar');
    await cache.setItem('foo2', 'bar');
    await cache.setItem('foo3', 'bar');
    await cache.removeItem('foo1', 'foo2', 'foo3');
    expect(await cache.getItem('foo1')).toBe(null);
    expect(await cache.getItem('foo2')).toBe(null);
    expect(await cache.getItem('foo3')).toBe(null);
  });

  it('should prefix items', async () => {
    await cache.setItem('foo', 'bar');
    expect(storage.getItem('app:foo')).toBe('bar');

    const wrappedCache = new Cache(cache, 'nested');
    await wrappedCache.setItem('foo', 'bar');
    expect(storage.getItem('app:nested:foo')).toBe('bar');
  });
});
