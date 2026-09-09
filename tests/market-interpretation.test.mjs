import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const memberApiSource = await readFile(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("market pages render the system interpretation below the stage map", () => {
  const mapPosition = pageSource.indexOf('<section className="map-panel" id="stage-map">');
  const interpretationPosition = pageSource.indexOf("<MarketInterpretationPanel interpretation={activeInterpretation}");
  const footerPosition = pageSource.indexOf("<footer>", interpretationPosition);

  assert.ok(mapPosition >= 0);
  assert.ok(interpretationPosition > mapPosition);
  assert.ok(footerPosition > interpretationPosition);
  assert.match(pageSource, /\{marketTitle\}阶段解读/);
  assert.doesNotMatch(pageSource, /系统解读/);
  assert.doesNotMatch(pageSource, /AI解读/);
});

test("interpretation is typed, optional for legacy snapshots, and responsive", () => {
  assert.match(memberApiSource, /schemaVersion: "lz-market-interpretation-v1"/);
  assert.match(memberApiSource, /interpretation\?: MarketInterpretation/);
  assert.match(styles, /\.market-interpretation-grid/);
});

test("interpretation cards use soft backgrounds without colored top borders", () => {
  assert.match(styles, /\.interpretation-structure \{ background: #eef4ff; \}/);
  assert.match(styles, /\.interpretation-maturity \{ background: #eefaf4; \}/);
  assert.match(styles, /\.interpretation-observation \{ background: #fff7e8; \}/);
  assert.match(styles, /\.interpretation-divergence \{ background: #fff1f3; \}/);
  assert.doesNotMatch(styles, /border-top-color/);
});

test("interpretation panel offers the current market image export", () => {
  assert.match(pageSource, /downloadMarketInterpretationImage\(interpretation, marketTitle\)/);
  assert.match(pageSource, /"生成图片"/);
  assert.match(pageSource, /marketTitle=\{activeViewMeta\.mapTitle\}/);
});
