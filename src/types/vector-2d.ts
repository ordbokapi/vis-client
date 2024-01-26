/**
 * Describes any type that has x and y coordinates.
 */
export interface IPoint {
  /**
   * X coordinate.
   */
  x: number;

  /**
   * Y coordinate.
   */
  y: number;
}

/**
 * 2-dimensional vector.
 */
export class Vector2D {
  /**
   * X coordinate.
   */
  x: number;

  /**
   * Y coordinate.
   */
  y: number;

  /**
   * Create a new vector.
   * @param x X coordinate.
   * @param y Y coordinate.
   */
  constructor(x?: number, y?: number);
  /**
   * Create a new vector.
   * @param obj Object with x and y coordinates.
   */
  constructor(obj: IPoint);
  constructor(objOrX?: IPoint | number, y?: number) {
    if (objOrX && typeof objOrX === 'object') {
      this.x = objOrX.x;
      this.y = objOrX.y;
    } else {
      this.x = objOrX ?? 0;
      this.y = y ?? 0;
    }
  }

  /**
   * Add a vector to this vector.
   * @param v Vector to add.
   */
  add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  /**
   * Subtract a vector from this vector.
   * @param v Vector to subtract.
   */
  subtract(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  /**
   * Multiply this vector by a scalar.
   * @param s Scalar to multiply by.
   */
  multiply(s: number): Vector2D;
  /**
   * Multiply this vector by another vector.
   * @param v Vector to multiply by.
   */
  multiply(v: Vector2D): Vector2D;
  multiply(sOrV: number | Vector2D): Vector2D {
    if (typeof sOrV === 'number') {
      return new Vector2D(this.x * sOrV, this.y * sOrV);
    } else {
      return new Vector2D(this.x * sOrV.x, this.y * sOrV.y);
    }
  }

  /**
   * Divide this vector by a scalar.
   * @param s Scalar to divide by.
   */
  divide(s: number): Vector2D;
  /**
   * Divide this vector by another vector.
   * @param v Vector to divide by.
   */
  divide(v: Vector2D): Vector2D;
  divide(sOrV: number | Vector2D): Vector2D {
    if (typeof sOrV === 'number') {
      return new Vector2D(this.x / sOrV, this.y / sOrV);
    } else {
      return new Vector2D(this.x / sOrV.x, this.y / sOrV.y);
    }
  }

  /**
   * Get the magnitude of this vector.
   */
  get magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Get the unit vector of this vector.
   */
  get unit(): Vector2D {
    return this.divide(this.magnitude);
  }

  /**
   * Get the dot product of this vector and another vector.
   * @param v Vector to get the dot product with.
   */
  dot(v: Vector2D): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Get the angle between this vector and another vector.
   * @param v Vector to get the angle with.
   */
  angle(v: Vector2D): number;
  /**
   * Get the angle between this vector and the x-axis.
   */
  angle(): number;
  angle(v?: Vector2D): number {
    if (v) {
      return Math.acos(this.dot(v) / (this.magnitude * v.magnitude));
    } else {
      return Math.atan2(this.y, this.x);
    }
  }

  /**
   * Get the distance between this vector and another vector.
   * @param v Vector to get the distance with.
   */
  distance(v: Vector2D): number {
    return this.subtract(v).magnitude;
  }
}
