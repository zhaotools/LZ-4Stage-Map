import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("market tiles provide a pointer-following stage detail card", () => {
  assert.match(source, /onPointerMove/);
  assert.match(source, /onClick=\{\(event\) => onMarketTap/);
  assert.match(source, /pointerType !== "touch"/);
  assert.match(source, /touch-card/);
  assert.match(source, /关闭资产阶段信息/);
  assert.match(source, /market-hover-card/);
  for (const label of ["当前阶段", "确认时间", "本周观察", "MA30趋势"]) {
    assert.match(source, new RegExp(label));
  }
  assert.doesNotMatch(source, /阶段详细信息/);
  assert.doesNotMatch(source, /<dt>代码名称<\/dt>/);
  assert.match(source, /market\.shortCode} · \{market\.name/);
  assert.doesNotMatch(source, /<dt>持续时间<\/dt>/);
  assert.match(source, /market\.weeks}周· \{confirmationDate} 4AM UTC\+8/);
  assert.match(source, /getUTCDate\(\) \+ 1 - \(market\.weeks - 1\) \* 7/);
  assert.match(source, /market\.stageDetail/);
  assert.match(source, /market\.observationStage/);
  assert.match(source, /5周.*toFixed\(2\).*%/s);
});
