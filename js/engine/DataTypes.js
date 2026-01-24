// js/engine/DataTypes.js

/**
 * @fileoverview Defines core data types used throughout the engine,
 * including Vector2 for 2D mathematics and Color for color representation.
 */

export class Vector2 {
    /**
     * Represents a 2D vector and point.
     * @param {number} [x=0] - The x component.
     * @param {number} [y=0] - The y component.
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Adds another vector to this vector.
     * @param {Vector2} other The vector to add.
     * @returns {Vector2} A new Vector2 instance with the result.
     */
    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    /**
     * Subtracts another vector from this vector.
     * @param {Vector2} other The vector to subtract.
     * @returns {Vector2} A new Vector2 instance with the result.
     */
    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    /**
     * Multiplies this vector by a scalar.
     * @param {number} scalar The scalar to multiply by.
     * @returns {Vector2} A new Vector2 instance with the result.
     */
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    /**
     * Calculates the magnitude (length) of the vector.
     * @returns {number} The magnitude of the vector.
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Calculates the distance to another vector.
     * @param {Vector2} other The other vector.
     * @returns {number} The distance between the two vectors.
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Normalizes the vector, making its magnitude 1.
     * @returns {Vector2} A new normalized Vector2 instance.
     */
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) {
            return new Vector2(0, 0);
        }
        return new Vector2(this.x / mag, this.y / mag);
    }

    /**
     * Clones the vector.
     * @returns {Vector2} A new Vector2 instance with the same values.
     */
    clone() {
        return new Vector2(this.x, this.y);
    }
}

export class Color {
    /**
     * Represents a color with RGBA components.
     * @param {number} [r=255] - Red component (0-255).
     * @param {number} [g=255] - Green component (0-255).
     * @param {number} [b=255] - Blue component (0-255).
     * @param {number} [a=255] - Alpha component (0-255).
     */
    constructor(r = 255, g = 255, b = 255, a = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    /**
     * Converts the color to a CSS hexadecimal string.
     * @returns {string} The color in #RRGGBB format.
     */
    toHexString() {
        const toHex = c => ('0' + Math.round(c).toString(16)).slice(-2);
        return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
    }

    /**
     * Converts the color to a CSS RGBA string.
     * @returns {string} The color in rgba(r, g, b, a) format.
     */
    toRgbaString() {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a / 255})`;
    }

    /**
     * Clones the color.
     * @returns {Color} A new Color instance with the same values.
     */
    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }

    /**
     * Creates a Color instance from a hexadecimal string.
     * @param {string} hex The hex string (e.g., "#FF5733").
     * @returns {Color} A new Color instance.
     */
    static fromHexString(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? new Color(
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ) : new Color(255, 255, 255);
    }
}
