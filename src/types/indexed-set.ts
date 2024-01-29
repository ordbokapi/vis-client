/**
 * An indexed set which allows array-like access to its elements.
 */
export class IndexedSet<T> {
  /**
   * The array of elements in the set.
   */
  #elements: T[];

  /**
   * The indices of the elements in the set.
   */
  #indices: Map<T, number>;

  /**
   * Initializes a new instance of the IndexedSet class.
   * @param elements The initial elements.
   */
  constructor(elements?: Iterable<T>) {
    this.#elements = [];
    this.#indices = new Map();

    if (elements) {
      for (const element of elements) {
        this.add(element);
      }
    }
  }

  /**
   * Gets the elements in the set.
   */
  get elements(): T[] {
    return this.#elements.slice();
  }

  /**
   * Gets the number of elements in the set.
   */
  get size(): number {
    return this.#indices.size;
  }

  /**
   * Adds an element to the set.
   * @param element The element to add.
   */
  add(element: T): this {
    if (this.#indices.has(element)) {
      return this;
    }

    this.#elements.push(element);
    this.#indices.set(element, this.#elements.length - 1);
    return this;
  }

  /**
   * Deletes an element from the set.
   * @param element The element to delete.
   * @returns `true` if the element was deleted; otherwise, `false`.
   */
  delete(element: T): boolean {
    const result = this.#indices.delete(element);

    if (result) {
      const index = this.#indices.get(element)!;
      this.#elements.splice(index, 1);
      this.#indices.delete(element);

      // recompute other indices
      for (let i = index; i < this.#elements.length; i++) {
        this.#indices.set(this.#elements[i], i);
      }
    }

    return result;
  }

  /**
   * Clears the set.
   */
  clear(): void {
    this.#indices.clear();
    this.#elements = [];
  }

  /**
   * Gets the element at the specified index.
   * @param index The index.
   */
  get(index: number): T {
    return this.#elements[index];
  }

  /**
   * Checks whether the set contains the specified element.
   * @param element The element.
   */
  has(element: T): boolean {
    return this.#indices.has(element);
  }

  /**
   * Gets the index of the specified element.
   * @param element The element.
   */
  indexOf(element: T): number {
    return this.#indices.get(element) ?? -1;
  }

  /**
   * Iterates over the elements in the set.
   */
  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.#elements;
  }

  /**
   * Iterates over the elements and indices in the set.
   */
  *entries(): IterableIterator<[number, T]> {
    yield* this.#elements.entries();
  }

  /**
   * Iterates over the elements in the set.
   */
  *values(): IterableIterator<T> {
    yield* this.#elements.values();
  }
}
