import { cache } from '../src/services/cache';

describe('Cache service', () => {
  it('get/set/del roundtrip', async () => {
    await cache.set('k:1', { a: 1 }, 10);
    expect(await cache.get('k:1')).toEqual({ a: 1 });
    await cache.del('k:1');
    expect(await cache.get('k:1')).toBeNull();
  });

  it('delByPrefix clears only matching keys', async () => {
    await cache.set('courses:list:1', 1, 10);
    await cache.set('courses:list:2', 2, 10);
    await cache.set('categories:all', 3, 10);
    await cache.delByPrefix('courses:list:');
    expect(await cache.get('courses:list:1')).toBeNull();
    expect(await cache.get('courses:list:2')).toBeNull();
    expect(await cache.get('categories:all')).toEqual(3);
  });
});
