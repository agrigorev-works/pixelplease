/** Keep native click/keyboard activation; repeat only an intentional pointer hold. */
export function bindHoldButton(button: HTMLButtonElement, step: () => void): void {
  let pointerId: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let repeated = false;

  const stop = () => {
    clearTimeout(timer);
    timer = undefined;
    pointerId = null;
  };
  const repeat = () => {
    if (pointerId === null || button.disabled) {
      stop();
      return;
    }
    repeated = true;
    step();
    if (button.disabled) stop();
    else timer = setTimeout(repeat, 65);
  };

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.isPrimary || button.disabled || pointerId !== null) return;
    repeated = false;
    pointerId = event.pointerId;
    // Capture real pointers so a release outside the button also ends the hold.
    if (button.hasPointerCapture(event.pointerId) || event.isTrusted) {
      button.setPointerCapture(event.pointerId);
    }
    timer = setTimeout(repeat, 350);
  });
  const endPointer = (event: PointerEvent) => {
    if (event.pointerId === pointerId) stop();
  };
  window.addEventListener("pointerup", endPointer, true);
  window.addEventListener("pointercancel", endPointer, true);
  button.addEventListener("lostpointercapture", endPointer);
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  button.addEventListener("click", (event) => {
    // Keyboard/assistive activation has detail=0 and must always remain usable.
    if (!button.disabled && (!repeated || event.detail === 0)) step();
    repeated = false;
  });
}
