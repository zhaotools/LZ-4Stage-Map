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
  assert.match(source, /market\.weeks}周· \{confirmationTime}/);
  assert.match(source, /stageConfirmationTimeFor\(market\)/);
  assert.match(source, /market\.stageDetail/);
  assert.match(source, /market\.observationStage/);
  assert.match(source, /function observationStageFor\(market: Market\)/);
  assert.match(source, /function observationConfirmationFor\(market: Market\)/);
  assert.match(source, /market\.observation\.match\(\/\\b\\d\+\\\/\\d\+\\b\/\)/);
  assert.match(source, /`\$\{progress\}周确认`/);
  assert.match(source, /label\.match\(\/\^S\[1-4\]\//);
  assert.match(source, /stageMeta\[observationStage\]\.color/);
  assert.match(source, /maDirection === "上升" \? stageMeta\.S2\.color : maDirection === "下降" \? stageMeta\.S4\.color : undefined/);
  assert.match(source, /\{observationLabel\}\{observationConfirmation && <> · \{observationConfirmation\}<\/>\}/);
  assert.match(source, /<dd style=\{\{ color: maColor \}\}>\{maDirection\}/);
  assert.match(source, /momentum > 0 \? "上升" : momentum < 0 \? "下降" : "持平"/);
  assert.match(source, /5周.*toFixed\(2\).*%/s);
});

test("market tiles outline observation-stage changes", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /observationStage !== item\.stage/);
  assert.match(source, /tile-observation-change/);
  assert.match(source, /--observation-border.*stageMeta\[observationStage\]\.color/s);
  assert.match(css, /\.map-tile\.tile-observation-change \{ box-shadow: inset 0 0 0 2px var\(--observation-border\); \}/);
  assert.doesNotMatch(css, /tile-observation-change \{[^}]*#ffffff/s);
  assert.match(source, /颜色代表当前所处阶段，外框代表本周观察变化/);
  assert.doesNotMatch(source, /方块大小体现资产重要性，颜色代表当前所处阶段/);
});
