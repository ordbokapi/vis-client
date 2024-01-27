import { IPoint, Vector2D } from './vector-2d.js';

/**
 * A type that can be converted to a rectangle.
 */
export type RectLike =
  | {
      /**
       * The x coordinate of the top-left corner of the rectangle.
       */
      x: number;

      /**
       * The y coordinate of the top-left corner of the rectangle.
       */
      y: number;

      /**
       * The width of the rectangle.
       */
      width: number;

      /**
       * The height of the rectangle.
       */
      height: number;
    }
  | {
      /**
       * The top-left corner of the rectangle.
       */
      position: IPoint;

      /**
       * The width of the rectangle.
       */
      width: number;

      /**
       * The height of the rectangle.
       */
      height: number;
    }
  | {
      /**
       * The top-left corner of the rectangle.
       */
      position: IPoint;

      /**
       * The size of the rectangle.
       */
      size: IPoint;
    };

/**
 * A 2D rectangle.
 */
export class Rect2D {
  /**
   * The top-left corner of the rectangle.
   */
  position: Vector2D;

  /**
   * The size of the rectangle.
   */
  size: Vector2D;

  /**
   * Create a new rectangle.
   * @param rect An object with x, y, width and height properties.
   */
  constructor(rect: RectLike);
  /**
   * Create a new rectangle.
   * @param topLeft The top-left corner of the rectangle.
   * @param size The size of the rectangle.
   */
  constructor(topLeft: IPoint, size: IPoint);
  /**
   * Create a new rectangle.
   * @param topLeft The top-left corner of the rectangle.
   * @param width The width of the rectangle.
   * @param height The height of the rectangle.
   */
  constructor(topLeft: IPoint, width: number, height: number);
  /**
   * Create a new rectangle.
   * @param x The x coordinate of the top-left corner of the rectangle.
   * @param y The y coordinate of the top-left corner of the rectangle.
   * @param width The width of the rectangle.
   * @param height The height of the rectangle.
   */
  constructor(x: number, y: number, width: number, height: number);
  constructor(
    rectOrTopLeftOrX: RectLike | IPoint | number,
    widthOrYOrSize?: number | IPoint,
    widthOrHeight?: number,
    height?: number,
  ) {
    // 1st overload
    if (
      typeof rectOrTopLeftOrX === 'object' &&
      'x' in rectOrTopLeftOrX &&
      'y' in rectOrTopLeftOrX &&
      'width' in rectOrTopLeftOrX &&
      'height' in rectOrTopLeftOrX
    ) {
      this.position = new Vector2D(rectOrTopLeftOrX.x, rectOrTopLeftOrX.y);
      this.size = new Vector2D(rectOrTopLeftOrX.width, rectOrTopLeftOrX.height);
    }
    // 2nd overload
    else if (
      typeof rectOrTopLeftOrX === 'object' &&
      'x' in rectOrTopLeftOrX &&
      'y' in rectOrTopLeftOrX &&
      typeof widthOrYOrSize === 'object' &&
      'x' in widthOrYOrSize &&
      'y' in widthOrYOrSize
    ) {
      this.position = new Vector2D(rectOrTopLeftOrX.x, rectOrTopLeftOrX.y);
      this.size = new Vector2D(widthOrYOrSize.x, widthOrYOrSize.y);
    }
    // 3rd overload
    else if (
      typeof rectOrTopLeftOrX === 'object' &&
      'x' in rectOrTopLeftOrX &&
      'y' in rectOrTopLeftOrX &&
      typeof widthOrYOrSize === 'number' &&
      typeof widthOrHeight === 'number'
    ) {
      this.position = new Vector2D(rectOrTopLeftOrX.x, rectOrTopLeftOrX.y);
      this.size = new Vector2D(widthOrYOrSize, widthOrHeight);
    }
    // 4th overload
    else if (
      typeof rectOrTopLeftOrX === 'number' &&
      typeof widthOrYOrSize === 'number' &&
      typeof widthOrHeight === 'number' &&
      typeof height === 'number'
    ) {
      this.position = new Vector2D(rectOrTopLeftOrX, widthOrYOrSize);
      this.size = new Vector2D(widthOrHeight, height);
    } else {
      throw new Error('Invalid arguments');
    }
  }

  /**
   * The x coordinate of the top-left corner of the rectangle.
   */
  get x(): number {
    return this.position.x;
  }
  set x(value: number) {
    this.position.x = value;
  }

  /**
   * The y coordinate of the top-left corner of the rectangle.
   */
  get y(): number {
    return this.position.y;
  }
  set y(value: number) {
    this.position.y = value;
  }

  /**
   * The width of the rectangle.
   */
  get width(): number {
    return this.size.x;
  }
  set width(value: number) {
    this.size.x = value;
  }

  /**
   * The height of the rectangle.
   */
  get height(): number {
    return this.size.y;
  }
  set height(value: number) {
    this.size.y = value;
  }

  /**
   * The top-left corner of the rectangle.
   */
  get topLeft(): Vector2D {
    return new Vector2D(this.position);
  }

  /**
   * The top-right corner of the rectangle.
   */
  get topRight(): Vector2D {
    return new Vector2D(this.position.x + this.size.x, this.position.y);
  }

  /**
   * The bottom-left corner of the rectangle.
   */
  get bottomLeft(): Vector2D {
    return new Vector2D(this.position.x, this.position.y + this.size.y);
  }

  /**
   * The bottom-right corner of the rectangle.
   */
  get bottomRight(): Vector2D {
    return new Vector2D(
      this.position.x + this.size.x,
      this.position.y + this.size.y,
    );
  }

  /**
   * The center of the rectangle.
   */
  get center(): Vector2D {
    return new Vector2D(
      this.position.x + this.size.x / 2,
      this.position.y + this.size.y / 2,
    );
  }

  /**
   * The area of the rectangle.
   */
  get area(): number {
    return this.size.x * this.size.y;
  }

  /**
   * The perimeter of the rectangle.
   */
  get perimeter(): number {
    return 2 * (this.size.x + this.size.y);
  }

  /**
   * Get the intersection of this rectangle and another rectangle.
   * @param rect The other rectangle.
   * @returns The intersection of the two rectangles, or null if they do not
   * intersect.
   */
  intersection(rect: Rect2D): Rect2D | null {
    const x1 = Math.max(this.position.x, rect.position.x);
    const y1 = Math.max(this.position.y, rect.position.y);
    const x2 = Math.min(
      this.position.x + this.size.x,
      rect.position.x + rect.size.x,
    );
    const y2 = Math.min(
      this.position.y + this.size.y,
      rect.position.y + rect.size.y,
    );

    if (x2 < x1 || y2 < y1) return null;

    return new Rect2D(x1, y1, x2 - x1, y2 - y1);
  }

  /**
   * Check if this rectangle contains a point.
   * @param point The point to check.
   */
  containsPoint(point: IPoint): boolean {
    return (
      point.x >= this.position.x &&
      point.x <= this.position.x + this.size.x &&
      point.y >= this.position.y &&
      point.y <= this.position.y + this.size.y
    );
  }

  /**
   * Check if this rectangle contains another rectangle.
   * @param rect The rectangle to check.
   */
  containsRect(rect: Rect2D): boolean {
    return (
      this.containsPoint(rect.position) &&
      this.containsPoint(rect.topRight) &&
      this.containsPoint(rect.bottomLeft) &&
      this.containsPoint(rect.bottomRight)
    );
  }

  /**
   * Check if this rectangle intersects another rectangle.
   * @param rect The rectangle to check.
   */
  intersectsRect(rect: Rect2D): boolean {
    return (
      this.containsPoint(rect.position) ||
      this.containsPoint(rect.topRight) ||
      this.containsPoint(rect.bottomLeft) ||
      this.containsPoint(rect.bottomRight)
    );
  }

  /**
   * Returns a copy of this rectangle.
   */
  copy(): Rect2D {
    return new Rect2D(this);
  }

  /**
   * Check if this rectangle is equal to another rectangle.
   * @param rect The rectangle to check.
   */
  equals(rect: Rect2D): boolean {
    return (
      this.position.equals(rect.position) &&
      this.width === rect.size.x &&
      this.height === rect.size.y
    );
  }
}
