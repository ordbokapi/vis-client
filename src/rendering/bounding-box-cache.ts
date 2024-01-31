import * as pixi from 'pixi.js';
// @ts-expect-error Broken types
import { Viewport } from 'pixi-viewport';
import { Rect2D, Vector2D } from '../types/index.js';

/**
 * A cache for bounding boxes of objects in the scene. Reduces the number of
 * bounding box calculations required.
 *
 * @remarks
 *
 * This class assumes that:
 *
 * 1. The sizes of objects do not change, only their positions;
 * 2. Objects or the projection are only scaled and translated, not rotated or
 *    otherwise transformed; and
 * 3. The anchor point of objects is at the geometric center of the object
 *    relative to its bounding box.
 */
export class BoundingBoxCache {
  /**
   * The viewport.
   */
  #viewport: Viewport;

  /**
   * The bounding box sizes in global space, without transformations applied.
   */
  #sizes = new Map<pixi.DisplayObject, Vector2D>();

  /**
   * The current viewport scale.
   */
  #scale = new Vector2D(1, 1);

  /**
   * Initializes a new instance of the {@link BoundingBoxCache `BoundingBoxCache`}
   * class.
   * @param viewport The viewport.
   */
  constructor(viewport: Viewport) {
    this.#viewport = viewport;
    this.#viewport.on('zoomed', () => this.#onZoomed());
    this.#scale = new Vector2D(this.#viewport.scale);
  }

  /**
   * Handles the `zoomed` event of the viewport.
   */
  #onZoomed(): void {
    const scale = new Vector2D(this.#viewport.scale);

    if (scale.equals(this.#scale)) {
      return;
    }

    this.#scale = scale;
  }

  /**
   * Forces the scale to be updated.
   */
  reload(): void {
    this.#scale = new Vector2D(this.#viewport.scale);
  }

  /**
   * Gets the bounding box of the specified object in local space.
   * @param object An object.
   */
  get(object: pixi.DisplayObject): Rect2D {
    const size = this.#sizes.get(object) ?? this.#cacheSize(object);

    const topLeft = new Vector2D(object.position).subtract(size.divide(2));

    return new Rect2D(topLeft, size);
  }

  /**
   * Caches the size of the specified object.
   * @param object An object.
   */
  #cacheSize(object: pixi.DisplayObject): Vector2D {
    const size = new Rect2D(object.getBounds()).size;

    this.#sizes.set(object, size.divide(this.#scale));

    return size;
  }

  /**
   * Clears the cache.
   */
  clear(): void {
    this.#sizes.clear();
  }
}
