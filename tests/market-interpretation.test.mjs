import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const memberApiSource = await readFile(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("market pages render the system interpretation below the stage map", () => {
  const mapPosition = pageSource.indexOf('<section className="map-panel" id="stage-map">');
  const interpretationPosition = pageSource.indexOf("<MarketInterpretationPanel interpretation={activeInterpretation} />");
  const footerPosition = pageSource.indexOf("<footer>", interpretationPosition);

  assert.ok(mapPosition >= 0);
  assert.ok(interpretationPosition > mapPosition);
  assert.ok(footerPosition > interpretationPosition);
  assert.match(pageSource, /市场阶段解读/);
  assert.match(pageSource, /系统解读/);
  assert.doesNotMatch(pageSource, /AI解读/);
});

test("interpretation is typed, optional for legacy snapshots, and responsive", () => {
  assert.match(memberApiSource, /schemaVersion: "lz-market-interpretation-v1"/);
  assert.match(memberApiSource, /interpretation\?: MarketInterpretation/);
  assert.match(styles, /\.market-interpretation-grid/);
});

test("interpretation cards use soft backgrounds matching their accent colors", () => {
  assert.match(styles, /\.interpretation-structure \{[^}]*border-top-color: #397ff6;[^}]*background: #eef4ff;/);
  assert.match(styles, /\.interpretation-maturity \{[^}]*border-top-color: #18a567;[^}]*background: #eefaf4;/);
  assert.match(styles, /\.interpretation-observation \{[^}]*border-top-color: #f09a18;[^}]*background: #fff7e8;/);
  assert.match(styles, /\.interpretation-divergence \{[^}]*border-top-color: #ed4859;[^}]*background: #fff1f3;/);
});
