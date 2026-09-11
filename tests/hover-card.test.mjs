import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createHoverResumeGuard } from "../app/lib/hover-resume.mjs";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("chart clicks synchronously remove details and tab restoration cannot re-open them", () => {
  assert.match(source, /flushSync\(\(\) => closeMarketCard\(\)\);\n\s*window\.open/);
  assert.match(source, /!hoverResumeGuard\.current\.allowPointer/);
  assert.match(source, /!hoverResumeGuard\.current\.allowFocus/);
  assert.match(source, /document\.hidden \|\| !document\.hasFocus\(\)/);
  assert.doesNotMatch(source, /hoverDismissed/);
  for (const event of ["blur", "focus", "pageshow", "visibilitychange"]) {
    assert.ok(source.includes(`addEventListener("${event}", dismiss)`));
    assert.ok(source.includes(`removeEventListener("${event}", dismiss)`));
  }
});

test("restored focus and stationary pointer stay dismissed; intentional movement restores hover", () => {
  const guard = createHoverResumeGuard();
  assert.equal(guard.allowPointer(100, 100), true);
  guard.dismiss();
  assert.equal(guard.allowFocus(), false);
  // New tab / return events may dismiss again; a synthetic leave never clears the guard.
  guard.dismiss();
  assert.equal(guard.allowPointer(100, 100), false);
  assert.equal(guard.allowPointer(100, 100), false);
  assert.equal(guard.allowPointer(102, 102), false);
  assert.equal(guard.allowFocus(), false);
  assert.equal(guard.allowPointer(110, 100), true);
  assert.equal(guard.allowFocus(), true);
  guard.dismiss();
  guard.keyboardNavigation();
  assert.equal(guard.allowFocus(), true);
});

test("market tiles provide a pointer-following stage detail card", () => {
  assert.match(source, /onPointerMove/);
  assert.match(source, /onClick=\{\(\) => onMarketTap\(item\)\}/);
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

test("market map uses the flat four-stage palette, light framing and white tile gaps", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /S1: \{[^}]*color: "#3f7fd2"/);
  assert.match(source, /S2: \{[^}]*color: "#329b57"/);
  assert.match(source, /S3: \{[^}]*color: "#d68428"/);
  assert.match(source, /S4: \{[^}]*color: "#d0444e"/);
  assert.match(css, /\.market-map \{[^}]*border: 1px solid #e1e5ea;[^}]*background: #f0f2f5;/);
  assert.match(css, /\.map-group \{[^}]*border: 1px solid #e2e6eb;[^}]*background: #fff;/);
  assert.match(css, /\.map-tiles \{[^}]*gap: 1px;[^}]*padding: 0;[^}]*background: #fff;/);
  assert.match(css, /\.tile-s1 \{ background: #3f7fd2; \}/);
  assert.match(css, /\.tile-s2 \{ background: #329b57; \}/);
  assert.match(css, /\.tile-s3 \{ background: #d68428; \}/);
  assert.match(css, /\.tile-s4 \{ background: #d0444e; \}/);
});

test("market hover card uses a light gray surface", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.market-hover-card \{[^}]*border: 1px solid #e0e4e9;[^}]*color: #344054;[^}]*background: #f7f8fa;/);
  assert.match(css, /\.market-hover-card dd \{[^}]*color: #344054;/);
  assert.doesNotMatch(css, /\.market-hover-card \{[^}]*background: #202735;/);
});
test("crypto pending and unavailable analysis is clearly labelled without changing normal assets", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /cryptoFreshness === "pending"/);
  assert.match(source, /数据待更新 · 保留历史结果/);
  assert.match(source, /cryptoFreshness === "unavailable"/);
  assert.match(source, /tile-unavailable/);
  assert.doesNotMatch(source, /行情来源|crypto-source-note/);
  assert.match(source, /quoteCurrency/);
  assert.match(source, /confirmationTimeForTradingDate\(market\)/);
});
