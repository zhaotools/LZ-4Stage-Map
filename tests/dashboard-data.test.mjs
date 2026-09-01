import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = JSON.parse(await readFile(new URL("../public/data/dashboard.json", import.meta.url), "utf8"));
const appDashboard = JSON.parse(await readFile(new URL("../data/dashboard.json", import.meta.url), "utf8"));

test("public dashboard contains only the global weekly analysis", () => {
  assert.deepEqual(appDashboard, dashboard);
  assert.equal(dashboard.schemaVersion, "lz-4stage-map-v2");
  assert.equal(dashboard.analysisPeriod, "weekly-completed-bars");
  assert.ok(["all", "traditional", "crypto"].includes(dashboard.updateScope));
  assert.match(dashboard.lastUpdatedAt.traditional, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(dashboard.lastUpdatedAt.crypto, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(dashboard.markets.length, 16);
  const globalCodes = dashboard.markets.filter((market) => market.collections.includes("global")).map((market) => market.code).sort();
  assert.deepEqual(globalCodes, ["000300.SH", "BTC-USD", "CL", "DXY", "ETH-USD", "GSPC.INDEX", "HSI", "HSTECH", "N225", "NDQ", "SOXX", "STOXX50E", "SZ399006", "US10Y", "VIX", "XAU"]);
  assert.ok(dashboard.markets.find((market) => market.code === "ETH-USD")?.collections.includes("global"));
  assert.equal(dashboard.markets.find((market) => market.code === "N225")?.providerSymbol, "^N225");
  assert.equal(dashboard.markets.find((market) => market.code === "STOXX50E")?.providerSymbol, "^STOXX50E");
  const us10y = dashboard.markets.find((market) => market.code === "US10Y");
  assert.equal(us10y?.providerSymbol, "^TNX");
  assert.equal(us10y?.source, "Yahoo Finance");
  assert.equal(us10y?.region, "大宗·宏观");
  assert.ok(us10y?.collections.includes("global"));
  for (const market of dashboard.markets) {
    assert.ok(market.collections.includes("global"));
    assert.match(market.stage, /^S[1-4]$/);
    assert.match(market.subStage, /^S[1-4](?:A|B|-|B-)?$/);
    assert.match(market.observationStage, /^(?:S[1-4](?:A|B|-|B-)?|UNCONFIRMED)$/);
    assert.ok(market.stageDetail.length > 0);
    assert.ok(market.weeks >= 1);
    assert.ok(Number.isFinite(market.momentum));
    assert.ok(Number.isFinite(market.distance));
    assert.match(market.stageAsOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(market.marketAsOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(["live", "cache"].includes(market.dataStatus));
    assert.ok(market.collections.every((collection) => ["global", "crypto7", "usSelected", "chinaIndices", "hkSelected"].includes(collection)));
  }
  const btc = dashboard.markets.find((market) => market.code === "BTC-USD");
  assert.equal(btc?.providerSymbol, "BTCUSDT");
  assert.ok(btc?.collections.includes("global"));
});
