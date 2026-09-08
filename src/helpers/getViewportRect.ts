/**
 * The region of the page that the three.js canvas occupies, in CSS
 * pixels relative to the viewport.
 */
export type ViewportRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Resolves the rectangle that pointer coordinates should be measured
 * against.
 *
 * Falls back to the browser viewport when no element is supplied, or
 * when the element has not been laid out yet (zero width or height),
 * which would otherwise produce a division by zero.
 */
const getViewportRect = (domElement?: HTMLElement | null): ViewportRect => {
  if (domElement && typeof domElement.getBoundingClientRect === 'function') {
    const rect = domElement.getBoundingClientRect();

    if (rect.width > 0 && rect.height > 0) {
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }
  }

  return {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export default getViewportRect;
