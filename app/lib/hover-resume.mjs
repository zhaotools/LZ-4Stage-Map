// Tab restoration can emit pointerleave, focus and pointermove without user intent.
// Only deliberate pointer movement or keyboard navigation re-enables details.
export function createHoverResumeGuard() {
  let blocked = false;
  let anchor = null;
  return {
    dismiss() { blocked = true; anchor = null; },
    keyboardNavigation() { blocked = false; anchor = null; },
    allowFocus() { return !blocked; },
    allowPointer(x, y) {
      if (!blocked) return true;
      if (!anchor) { anchor = { x, y }; return false; }
      if (Math.hypot(x - anchor.x, y - anchor.y) < 5) return false;
      blocked = false;
      anchor = null;
      return true;
    },
  };
}
