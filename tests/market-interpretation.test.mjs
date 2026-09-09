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
