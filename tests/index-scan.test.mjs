import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { indexCodeOptionsFor, matchS2ScanRules, resolveMapIndexLookup } from "../app/lib/index-scan.mjs";

test("existing region tabs offer exactly the selected 30 map assets", () => {
  assert.equal(indexCodeOptionsFor("A股").length, 16);
  assert.equal(indexCodeOptionsFor("港股").length, 3);
  assert.equal(indexCodeOptionsFor("美股").length, 11);
  assert.deepEqual(indexCodeOptionsFor("加密"), []);
  for (const region of ["A股", "港股", "美股"]) {
    for (const code of indexCodeOptionsFor(region)) {
      const result = resolveMapIndexLookup(region, code);
      assert.ok(result, `${region} ${code}`);
      assert.equal(result.assetKey, `MAP:${result.code}`);
    }
  }
});

test("code aliases resolve to one catalog asset without intercepting ordinary stocks", () => {
  assert.equal(resolveMapIndexLookup("A股", "000300")?.code, "000300.SH");
  assert.equal(resolveMapIndexLookup("A股", "SZ399006")?.code, "SZ399006");
  assert.equal(resolveMapIndexLookup("A股", "931865.CSI")?.code, "931865.CSI");
  assert.equal(resolveMapIndexLookup("港股", "HSEWI")?.code, "HSEWI");
  assert.equal(resolveMapIndexLookup("美股", "SPX")?.code, "GSPC.INDEX");
  assert.equal(resolveMapIndexLookup("美股", "NDX")?.code, "NDQ");
  assert.equal(resolveMapIndexLookup("美股", "XLF")?.code, "XLF");
  for (const [region, code] of [["A股", "600519"], ["港股", "0700"], ["美股", "AAPL"], ["加密", "BTC"]]) {
    assert.equal(resolveMapIndexLookup(region, code), null);
  }
});

test("index lookup uses protected member snapshots and ordinary stocks keep Edge lookup", () => {
  const api = readFileSync(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/components/my-scan-page.tsx", import.meta.url), "utf8");
  assert.match(api, /resolveMapIndexLookup\(region, code\)/);
  assert.match(api, /getMemberSnapshot<MyScanIndexMarket>/);
  assert.match(api, /functions\.invoke\("lookup-watchlist-asset"/);
  assert.match(page, /indexCodeOptionsFor\(region\)/);
  assert.match(page, /onAdd\(candidate\.assetKey\)/);
  assert.doesNotMatch(page, /指数扫描|my-scan-mode-switch|my-scan-index-head/);
});

test("stage matching retains observation, S2A, and early S2 rules", () => {
  assert.deepEqual(matchS2ScanRules({ stage: "S1", observationStage: "S2A", subStage: "S1", weeks: 4 }), ["s4Recovery"]);
  assert.deepEqual(matchS2ScanRules({ stage: "S2", observationStage: "S2A", subStage: "S2A", weeks: 2 }), ["s2aEntry", "s2Early"]);
  assert.deepEqual(matchS2ScanRules({ stage: "S2", observationStage: "S2", subStage: "S2B", weeks: 8 }), []);
});
