import { describe, expect, it } from 'vitest';
import getViewportRect from '../getViewportRect.js';

const elementWithRect = (rect: Partial<DOMRect>): HTMLElement => {
  const element = document.createElement('div');
  const bounds = { left: 0, top: 0, width: 0, height: 0, ...rect };

  element.getBoundingClientRect = () =>
    ({ ...bounds, toJSON: () => bounds }) as DOMRect;

  return element;
};

describe('getViewportRect', () => {
  it('falls back to the window when no element is given', () => {
    expect(getViewportRect()).toEqual({
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });

  it('falls back to the window for a null element', () => {
    expect(getViewportRect(null).width).toBe(window.innerWidth);
  });

  it('uses the element rect when it has been laid out', () => {
    const element = elementWithRect({
      left: 40,
      top: 12,
      width: 300,
      height: 200,
    });

    expect(getViewportRect(element)).toEqual({
      left: 40,
      top: 12,
      width: 300,
      height: 200,
    });
  });

  it('falls back when the element has no size, avoiding a divide by zero', () => {
    const element = elementWithRect({ width: 0, height: 0 });

    expect(getViewportRect(element).width).toBe(window.innerWidth);
  });
});
