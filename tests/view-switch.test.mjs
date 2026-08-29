import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("sidebar switches between the four stage-map collections", () => {
  assert.match(pageSource, /switchView\("global"\)/);
  assert.match(pageSource, /switchView\("crypto7"\)/);
  assert.match(pageSource, /switchView\("usSelected"\)/);
  assert.match(pageSource, /switchView\("chinaIndices"\)/);
  assert.match(pageSource, /加密蓝筹阶段地图/);
  assert.match(pageSource, /美股精选阶段地图/);
  assert.match(pageSource, /A股指数阶段地图/);
  assert.match(pageSource, /usSelected: \["GSPC\.INDEX", "NDQ", "IWM", "SOXX", "VIX"\]/);
  assert.match(pageSource, /chinaIndices: \["SH000001", "000016\.SH", "000300\.SH", "000905\.SH"/);
  assert.match(pageSource, /item\.collections\.includes\(view\)/);
  assert.match(cssSource, /\.view-crypto7 \.map-美股/);
  assert.match(cssSource, /\.view-usSelected \.map-美股/);
  assert.match(cssSource, /\.view-usSelected \.map-美股 \.map-tiles \{ grid-template-columns: repeat\(6,/);
  assert.match(cssSource, /grid-template-rows: repeat\(3,/);
  assert.match(cssSource, /\.view-chinaIndices \.map-A股/);
  assert.match(pageSource, /className="distribution-fill"/);
  assert.match(pageSource, /color-mix\(in srgb, \$\{stageMeta\[stage\]\.color\} 14%, var\(--canvas\)\)/);
  assert.match(pageSource, /style=\{\{ width: `\$\{percent\}%`/);
  assert.match(cssSource, /\.distribution-segment \{[^}]*flex: 1 1 0;/);
  assert.match(cssSource, /\.distribution-fill \{[^}]*inset: 0 0 0 auto;/);
  assert.match(cssSource, /\.map-大宗-宏观 \{ grid-area: 5 \/ 4 \/ 9 \/ 7; \}/);
  assert.match(cssSource, /\.map-加密 \{ grid-area: 6 \/ 7 \/ 9 \/ 13; \}/);
});
