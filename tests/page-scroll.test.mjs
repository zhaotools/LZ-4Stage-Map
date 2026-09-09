import assert from "node:assert/strict";
import test from "node:test";

import { scrollPageToTop } from "../app/lib/page-scroll.mjs";

test("market view changes reset the page to the top after the next render", () => {
  let frameCallback;
  let scrollOptions;
  const targetWindow = {
    requestAnimationFrame(callback) { frameCallback = callback; },
    scrollTo(options) { scrollOptions = options; },
  };

  scrollPageToTop(targetWindow);
  assert.equal(scrollOptions, undefined);
  frameCallback();
  assert.deepEqual(scrollOptions, { top: 0, left: 0, behavior: "auto" });
});

test("scroll reset works when requestAnimationFrame is unavailable", () => {
  let scrollOptions;
  scrollPageToTop({ scrollTo(options) { scrollOptions = options; } });
  assert.deepEqual(scrollOptions, { top: 0, left: 0, behavior: "auto" });
});
