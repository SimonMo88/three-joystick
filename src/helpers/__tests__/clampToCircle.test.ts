import { describe, expect, it } from 'vitest';
import clampToCircle from '../clampToCircle.js';

describe('clampToCircle', () => {
  it('leaves a point inside the circle untouched', () => {
    const result = clampToCircle(103, 104, 100, 100, 75);

    expect(result.x).toBe(103);
    expect(result.y).toBe(104);
    expect(result.distance).toBe(5);
    expect(result.clampedDistance).toBe(5);
    expect(result.wasClamped).toBe(false);
  });

  it('treats a point exactly on the perimeter as inside', () => {
    const result = clampToCircle(175, 100, 100, 100, 75);

    expect(result.wasClamped).toBe(false);
    expect(result.clampedDistance).toBe(75);
  });

  it('pulls a point outside back onto the perimeter', () => {
    const result = clampToCircle(1100, 100, 100, 100, 75);

    expect(result.x).toBe(175);
    expect(result.y).toBe(100);
    expect(result.distance).toBe(1000);
    expect(result.clampedDistance).toBe(75);
    expect(result.wasClamped).toBe(true);
  });

  it('preserves direction when clamping diagonally', () => {
    const result = clampToCircle(400, 400, 100, 100, 75);
    const expected = 100 + 75 / Math.SQRT2;

    expect(result.x).toBeCloseTo(expected, 6);
    expect(result.y).toBeCloseTo(expected, 6);
    expect(Math.hypot(result.x - 100, result.y - 100)).toBeCloseTo(75, 6);
  });

  it('handles a point sitting exactly on the origin', () => {
    const result = clampToCircle(100, 100, 100, 100, 75);

    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.distance).toBe(0);
    expect(result.wasClamped).toBe(false);
  });

  it('collapses to the origin when the radius is zero', () => {
    const result = clampToCircle(300, 100, 100, 100, 0);

    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.clampedDistance).toBe(0);
    expect(result.wasClamped).toBe(true);
  });
});
