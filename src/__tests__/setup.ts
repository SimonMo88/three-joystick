/**
 * jsdom does not implement PointerEvent. The joystick only reads
 * `pointerId`, `pointerType`, `button` and the client coordinates, so a
 * MouseEvent subclass carrying those is enough to drive it.
 */
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    public readonly pointerId: number;
    public readonly pointerType: string;
    public readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  globalThis.PointerEvent =
    PointerEventPolyfill as unknown as typeof globalThis.PointerEvent;
}
