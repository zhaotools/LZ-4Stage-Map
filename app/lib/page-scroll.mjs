export function scrollPageToTop(targetWindow = window) {
  const reset = () => targetWindow.scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (typeof targetWindow.requestAnimationFrame === "function") {
    targetWindow.requestAnimationFrame(reset);
  } else {
    reset();
  }
}
