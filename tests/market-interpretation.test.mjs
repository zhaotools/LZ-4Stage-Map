import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const memberApiSource = await readFile(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("market pages render the synchronized V2 interpretation below the stage map", () => {
  const mapPosition = pageSource.indexOf('<section className="map-panel" id="stage-map">');
  const interpretationPosition = pageSource.indexOf("<MarketInterpretationPanel interpretation={activeInterpretation}");
  const footerPosition = pageSource.indexOf("<footer>", interpretationPosition);

  assert.ok(mapPosition >= 0);
  assert.ok(interpretationPosition > mapPosition);
  assert.ok(footerPosition > interpretationPosition);
  assert.match(pageSource, /<h2 id="market-interpretation-title">\{presentation\.title\}<\/h2>/);
  assert.match(pageSource, /buildInterpretationImageModel\(interpretation, marketTitle, confirmationLabel\)/);
  assert.doesNotMatch(pageSource, /系统解读/);
  assert.doesNotMatch(pageSource, /AI解读/);
});

test("interpretation accepts legacy snapshots and the structured V2 payload", () => {
  assert.match(memberApiSource, /"lz-market-interpretation-v1" \| "lz-market-interpretation-v2"/);
  assert.match(memberApiSource, /stageDistribution\?:/);
  assert.match(memberApiSource, /confirmedChanges\?:/);
  assert.match(memberApiSource, /observations\?:/);
  assert.match(memberApiSource, /interpretation\?: MarketInterpretation/);
});

test("interpretation uses seasonal colors only for stage summaries and neutral content cards", () => {
  assert.match(styles, /\.market-interpretation-stages > div[^}]+background: var\(--interpretation-stage-bg\)/);
  assert.match(styles, /\.market-interpretation-item[^}]+background: #fbfcfe/);
  assert.match(pageSource, /<h3>市场结构<\/h3>/);
  assert.match(pageSource, /<h3>关键位置<\/h3>/);
  assert.match(pageSource, /<h3>本期变化<\/h3>/);
  assert.doesNotMatch(styles, /\.interpretation-structure|\.interpretation-maturity|\.interpretation-observation|\.interpretation-divergence/);
  assert.doesNotMatch(styles, /border-top-color/);
});

test("stage summaries show only percentages and market structure centers the stage column", () => {
  assert.match(pageSource, /<strong>\{item\.label\}<\/strong><span>\{item\.percent\}%<\/span>/);
  assert.doesNotMatch(pageSource, /\{item\.count\} · \{item\.percent\}%/);
  assert.match(styles, /\.market-structure-list dd \{[^}]*left: 50%;[^}]*transform: translateX\(-50%\);[^}]*text-align: center;/);
});

test("interpretation panel exports the same content and explicit confirmation dates", () => {
  assert.match(pageSource, /downloadMarketInterpretationImage\(interpretation, marketTitle, confirmationLabel\)/);
  assert.match(pageSource, /"生成图片"/);
  assert.match(pageSource, /marketTitle=\{activeViewMeta\.mapTitle\}/);
  assert.match(pageSource, /confirmationLabel=\{interpretationConfirmationLabel\}/);
  assert.match(pageSource, /阶段数据截至：传统市场 \$\{traditionalInterpretationDate/);
  assert.match(pageSource, /加密市场 \$\{cryptoInterpretationDate/);
  assert.match(pageSource, /阶段数据截至：\$\{commonConfirmationDate\}/);
});

test("mobile interpretation date can wrap without changing desktop", () => {
  const mobileStyles = styles.slice(styles.indexOf("@media (max-width: 480px)"));
  assert.match(styles, /\.market-interpretation-date \{ color: #7b899e; font-size: 10px; white-space: nowrap; \}/);
  assert.match(mobileStyles, /\.market-interpretation-date \{ width: 100%; text-align: right; font-size: 10px; white-space: normal; overflow-wrap: anywhere; \}/);
});
