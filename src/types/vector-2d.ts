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
   * Normalize this vector.
   * @param length Length to normalize to. If undefined, the vector is
   * normalized to a length of 1.
   */
  normalize(length?: number): Vector2D {
    if (length) {
      return this.unit.multiply(length);
    } else {
      return this.unit;
    }
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

  /**
   * Floors the x and y coordinates of this vector.
   */
  floor(): Vector2D {
    return new Vector2D(Math.floor(this.x), Math.floor(this.y));
  }

  /**
   * Rounds the x and y coordinates of this vector.
   */
  round(): Vector2D {
    return new Vector2D(Math.round(this.x), Math.round(this.y));
  }

  /**
   * Ceils the x and y coordinates of this vector.
   */
  ceil(): Vector2D {
    return new Vector2D(Math.ceil(this.x), Math.ceil(this.y));
  }

  /**
   * Returns a copy of this vector.
   */
  copy(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  /**
   * Returns whether this vector is equal to another vector.
   * @param vector Vector to compare with.
   * @param epsilon Epsilon value for floating point comparison. If undefined, no
   * epsilon is used.
   */
  equals(vector: Vector2D, epsilon?: number): boolean {
    if (epsilon) {
      return (
        Math.abs(this.x - vector.x) < epsilon &&
        Math.abs(this.y - vector.y) < epsilon
      );
    } else {
      return this.x === vector.x && this.y === vector.y;
    }
  }

  /**
   * Returns a string representation of this vector.
   * @param precision Number of decimal places to round to. If undefined, no
   * rounding is done.
   */
  toString(precision?: number): string {
    return `(${this.x.toFixed(precision)},${this.y.toFixed(precision)})`;
  }

  /**
   * Parse a vector from a string.
   * @param str String to parse.
   */
  static parse(str: string): Vector2D {
    const match = str.match(/^\((?<x>-?\d+),(?<y>-?\d+)\)$/);

    if (!match) throw new Error('Invalid vector string');

    const x = Number.parseInt(match.groups!.x, 10);

    if (Number.isNaN(x)) throw new Error('Invalid vector string, bad x');

    const y = Number.parseInt(match.groups!.y, 10);

    if (Number.isNaN(y)) throw new Error('Invalid vector string, bad y');

    return new Vector2D(x, y);
  }
}
