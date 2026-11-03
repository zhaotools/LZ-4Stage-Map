import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { INDEX_SCAN_VIEWS, matchS2ScanRules, selectIndexScanMarkets } from "../app/lib/index-scan.mjs";

test("index scan includes the configured A-share, Hong Kong and US market and sector groups", () => {
  assert.deepEqual(INDEX_SCAN_VIEWS, ["chinaIndices", "hkSelected", "usSelected"]);
  const china = ["000300.SH", "930997.CSI", "399933.SZ", "600519.SH"].map((code) => ({ code }));
  const hongKong = ["HSI", "HSTECH", "HSEWI", "700.HK"].map((code) => ({ code }));
  const us = ["GSPC.INDEX", "NDQ", "IWM", "RSP", "VIX", "SOXX", "XLF", "XLE", "XLV", "XLI", "XLY", "NVDA", "DXY"].map((code) => ({ code }));
  assert.deepEqual(selectIndexScanMarkets("chinaIndices", china).map((asset) => asset.code), ["000300.SH", "930997.CSI", "399933.SZ"]);
  assert.deepEqual(selectIndexScanMarkets("hkSelected", hongKong).map((asset) => asset.code), ["HSI", "HSTECH", "HSEWI"]);
  assert.deepEqual(selectIndexScanMarkets("usSelected", us).map((asset) => asset.code), us.slice(0, 11).map((asset) => asset.code));
});

test("S2 scan criteria match the existing radar semantics and count overlapping rules separately", () => {
  const base = { stage: "S1", subStage: "S1", weeks: 4, observationStage: "S2" };
  assert.deepEqual(matchS2ScanRules(base), ["s4Recovery"]);
  assert.deepEqual(matchS2ScanRules({ ...base, stage: "S2", subStage: "S2A", weeks: 1 }), ["s2aEntry", "s2Early"]);
  assert.deepEqual(matchS2ScanRules({ ...base, stage: "S2", subStage: "S2-", weeks: 5 }), []);
  assert.deepEqual(matchS2ScanRules(null), []);
});

test("index scan reads protected market snapshots without adding indexes to the member watchlist", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const component = await readFile(new URL("../app/components/my-scan-page.tsx", import.meta.url), "utf8");
  assert.match(page, /INDEX_SCAN_VIEWS[\s\S]*\.map\(\(key\) => getMemberSnapshot<DashboardMarket>/);
  assert.match(component, /指数扫描/);
  assert.match(component, /本周匹配/);
  assert.match(component, /indexMarkets\.map|filteredIndexes\.map/);
  assert.doesNotMatch(component, /onAdd\(market\.code\)/);
});
