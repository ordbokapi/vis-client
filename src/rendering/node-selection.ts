import { Container } from 'pixi.js';

/**
 * Represents a selection of nodes.
 */
export class NodeSelection {
  /**
   * The nodes in the selection.
   */
  #nodes: Set<Container> = new Set();

  /**
   * The tint to apply to selected nodes.
   */
  #tint: number;

  /**
   * Initializes a new instance of the NodeSelection class.
   * @param nodes The initial nodes in the selection.
   * @param tint The tint to apply to selected nodes.
   */
  constructor(nodes: Iterable<Container> = [], tint = 0x666666) {
    this.#nodes = new Set(nodes);
    this.#tint = tint;
  }

  /**
   * The tint to apply to selected nodes.
   */
  get tint() {
    return this.#tint;
  }
  set tint(value) {
    const oldTint = this.#tint;

    if (oldTint === value) return;

    this.#tint = value;

    for (const node of this.#nodes) {
      node.tint = value;
    }
  }

  /**
   * Iterates over the nodes in the selection.
   */
  [Symbol.iterator](): IterableIterator<Container> {
    return this.#nodes.values();
  }

  /**
   * Gets the number of nodes in the selection.
   */
  get size(): number {
    return this.#nodes.size;
  }

  /**
   * Adds a node to the selection.
   */
  add(node: Container) {
    this.#nodes.add(node);
    node.tint = this.#tint;
  }

  /**
   * Removes a node from the selection.
   */
  delete(node: Container) {
    this.#nodes.delete(node);
    node.tint = 0xffffff;
  }

  /**
   * Checks whether the given node is in the selection.
   */
  has(node: Container) {
    return this.#nodes.has(node);
  }

  /**
   * Clears the selection.
   */
  clear() {
    for (const node of this.#nodes) {
      node.tint = 0xffffff;
    }

    this.#nodes.clear();
  }

  /**
   * Selects the given nodes.
   */
  select(nodes: Iterable<Container> | Container) {
    this.clear();

    if (nodes instanceof Container) {
      this.add(nodes);
      return;
    }

    for (const node of nodes) {
      this.add(node);
    }
  }

  /**
   * Gets the first node in the selection.
   */
  first() {
    return this.#nodes.values().next().value;
  }
}
