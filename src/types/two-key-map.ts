/**
 * Map with a composite key of two values.
 */
export class TwoKeyMap<K1, K2, V> {
  #map = new Map<K1, Map<K2, V>>();

  /**
   * Gets the value for the given keys.
   * @param key1 The first key.
   * @param key2 The second key.
   */
  get(key1: K1, key2: K2): V | undefined {
    if (!this.#map.has(key1)) return undefined;
    return this.#map.get(key1)?.get(key2);
  }

  /**
   * Sets the value for the given keys.
   * @param key1 The first key.
   * @param key2 The second key.
   * @param value The value to set.
   */
  set(key1: K1, key2: K2, value: V) {
    if (!this.#map.has(key1)) this.#map.set(key1, new Map());
    this.#map.get(key1)?.set(key2, value);
  }

  /**
   * Deletes the value for the given keys.
   * @param key1 The first key.
   * @param key2 The second key.
   */
  delete(key1: K1, key2: K2) {
    this.#map.get(key1)?.delete(key2);
  }

  /**
   * Clears the map.
   */
  clear() {
    this.#map.clear();
  }

  /**
   * Gets the number of entries in the map.
   */
  get size() {
    return this.#map.size;
  }

  /**
   * Gets the entries in the map.
   */
  *entries(): IterableIterator<[K1, K2, V]> {
    for (const [key1, map] of this.#map.entries()) {
      for (const [key2, value] of map.entries()) {
        yield [key1, key2, value];
      }
    }
  }

  /**
   * Gets the entries in the map with the given key as the first key.
   * @param key1 The first key.
   */
  *entriesForKey1(key1: K1): IterableIterator<[K2, V]> {
    const map = this.#map.get(key1);
    if (!map) return;

    for (const [key2, value] of map.entries()) {
      yield [key2, value];
    }
  }

  /**
   * Gets the entries in the map with the given key as the second key.
   * @param key2 The second key.
   */
  *entriesForKey2(key2: K2): IterableIterator<[K1, V]> {
    for (const [key1, map] of this.#map.entries()) {
      const value = map.get(key2);
      if (!value) continue;

      yield [key1, value];
    }
  }

  /**
   * Gets the keys in the map.
   */
  *keys(): IterableIterator<[K1, K2]> {
    for (const [key1, map] of this.#map.entries()) {
      for (const key2 of map.keys()) {
        yield [key1, key2];
      }
    }
  }

  /**
   * Gets the values in the map.
   */
  *values(): IterableIterator<V> {
    for (const map of this.#map.values()) {
      for (const value of map.values()) {
        yield value;
      }
    }
  }

  /**
   * Gets the entries in the map.
   */
  *[Symbol.iterator](): IterableIterator<[K1, K2, V]> {
    yield* this.entries();
  }
}
