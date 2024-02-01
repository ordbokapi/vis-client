import { Vector2D } from './vector-2d.js';
import { encode, decode } from '@msgpack/msgpack';

/**
 * Data type for storing node positions.
 */
export class NodePositions extends Map<number, Vector2D> {
  /**
   * Converts a NodePositions object to a string.
   */
  toString(): string {
    const flatPositions: number[] = [];

    for (const [id, { x, y }] of this) {
      flatPositions.push(id, x, y);
    }

    const encoded = encode(flatPositions);

    console.log(JSON.stringify(flatPositions));

    return btoa(String.fromCharCode(...encoded));
  }

  /**
   * Converts a string to a NodePositions object.
   */
  static fromString(str: string): NodePositions {
    const decoded = decode(
      Uint8Array.from(atob(str), (c) => c.charCodeAt(0)),
    ) as number[];

    const positions = new NodePositions();

    for (let i = 0; i < decoded.length; i += 3) {
      positions.set(decoded[i], new Vector2D(decoded[i + 1], decoded[i + 2]));
    }

    return positions;
  }
}
