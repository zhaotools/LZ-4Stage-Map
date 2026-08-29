import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = JSON.parse(await readFile(new URL("../public/data/dashboard.json", import.meta.url), "utf8"));
const appDashboard = JSON.parse(await readFile(new URL("../data/dashboard.json", import.meta.url), "utf8"));

test("dashboard contains complete real weekly analysis", () => {
  assert.deepEqual(appDashboard, dashboard);
  assert.equal(dashboard.schemaVersion, "lz-4stage-map-v2");
  assert.equal(dashboard.analysisPeriod, "weekly-completed-bars");
  assert.equal(dashboard.markets.length, 49);
  assert.equal(dashboard.markets.filter((market) => market.collections.includes("global")).length, 16);
  assert.ok(dashboard.markets.find((market) => market.code === "ETH-USD")?.collections.includes("global"));
  const us10y = dashboard.markets.find((market) => market.code === "US10Y");
  assert.equal(us10y?.providerSymbol, "^TNX");
  assert.equal(us10y?.source, "Yahoo Finance");
  assert.equal(us10y?.region, "大宗·宏观");
  assert.ok(us10y?.collections.includes("global"));
  const crypto7Codes = dashboard.markets.filter((market) => market.collections.includes("crypto7")).map((market) => market.code).sort();
  assert.deepEqual(crypto7Codes, ["BTC-USD", "COIN", "CRCL", "ETH-USD", "HOOD", "HYPE-USD", "MSTR"]);
  const usSelectedCodes = dashboard.markets.filter((market) => market.collections.includes("usSelected")).map((market) => market.code).sort();
  assert.deepEqual(usSelectedCodes, ["AAPL", "AMZN", "BRK.B", "DXY", "GOOG", "GSPC.INDEX", "IWM", "JPM", "META", "MSFT", "NDQ", "NVDA", "SOXX", "TSLA", "US10Y", "VIX", "WMT", "XLE", "XLF", "XLV"]);
  assert.equal(dashboard.markets.filter((market) => market.collections.includes("usSelected") && market.region === "美股").length, 18);
  const chinaIndexCodes = dashboard.markets.filter((market) => market.collections.includes("chinaIndices")).map((market) => market.code).sort();
  assert.deepEqual(chinaIndexCodes, ["000016.SH", "000300.SH", "000688.SH", "000905.SH", "399933.SZ", "399967.SZ", "399975.SZ", "399976.SZ", "399986.SZ", "399997.SZ", "399998.SZ", "930708.CSI", "931151.CSI", "931865.CSI", "SH000001", "SZ399006"]);
  for (const market of dashboard.markets) {
    assert.match(market.stage, /^S[1-4]$/);
    assert.match(market.subStage, /^S[1-4](?:A|B|-|B-)?$/);
    assert.match(market.observationStage, /^S[1-4](?:A|B|-|B-)?$/);
    assert.ok(market.stageDetail.length > 0);
    assert.ok(market.weeks >= 1);
    assert.ok(Number.isFinite(market.momentum));
    assert.ok(Number.isFinite(market.distance));
    assert.match(market.stageAsOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(market.marketAsOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(["live", "cache"].includes(market.dataStatus));
    assert.ok(market.collections.every((collection) => ["global", "crypto7", "usSelected", "chinaIndices"].includes(collection)));
  }
  const btc = dashboard.markets.find((market) => market.code === "BTC-USD");
  assert.equal(btc.observationStage, "S2A");
  assert.equal(btc.stageDetail, "下降减速");
});
