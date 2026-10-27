import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const quadrantSource = await readFile(new URL("../app/lib/market-quadrant-image.mjs", import.meta.url), "utf8");

test("cross-market view renders four groups and relative-strength details", () => {
  for (const label of ["加密与科技", "美股内部结构", "区域市场对比", "宏观资产轮动"]) {
    assert.match(pageSource, new RegExp(label));
    assert.match(cssSource, new RegExp(`map-${label}`));
    assert.match(quadrantSource, new RegExp(label));
  }
  assert.match(pageSource, /近13周相对收益/);
  assert.match(pageSource, /绝对阶段/);
  assert.match(pageSource, /比率上升表示分子跑赢分母，不代表分子资产一定上涨/);
  assert.match(quadrantSource, /相对比率/);
});
