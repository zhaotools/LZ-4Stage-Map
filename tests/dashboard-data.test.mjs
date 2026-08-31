import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = JSON.parse(await readFile(new URL("../public/data/dashboard.json", import.meta.url), "utf8"));
const appDashboard = JSON.parse(await readFile(new URL("../data/dashboard.json", import.meta.url), "utf8"));

test("dashboard contains complete real weekly analysis", () => {
  assert.deepEqual(appDashboard, dashboard);
  assert.equal(dashboard.schemaVersion, "lz-4stage-map-v2");
  assert.equal(dashboard.analysisPeriod, "weekly-completed-bars");
  assert.ok(["all", "traditional", "crypto"].includes(dashboard.updateScope));
  assert.match(dashboard.lastUpdatedAt.traditional, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(dashboard.lastUpdatedAt.crypto, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(dashboard.markets.length, 64);
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
  const crypto7Codes = dashboard.markets.filter((market) => market.collections.includes("crypto7")).map((market) => market.code).sort();
  assert.deepEqual(crypto7Codes, ["BTC-USD", "COIN", "CRCL", "ETH-USD", "HOOD", "HYPE-USD", "MSTR", "SOL-USD"]);
  assert.equal(dashboard.markets.find((market) => market.code === "SOL-USD")?.providerSymbol, "SOLUSDT");
  const usSelectedCodes = dashboard.markets.filter((market) => market.collections.includes("usSelected")).map((market) => market.code).sort();
  assert.deepEqual(usSelectedCodes, ["AAPL", "AMZN", "BRK.B", "DXY", "GSPC.INDEX", "IWM", "MSFT", "NDQ", "NVDA", "RSP", "SOXX", "TSLA", "US10Y", "VIX", "WMT", "XLE", "XLF", "XLI", "XLV", "XLY"]);
  assert.equal(dashboard.markets.filter((market) => market.collections.includes("usSelected") && market.region === "美股").length, 18);
  const chinaIndexCodes = dashboard.markets.filter((market) => market.collections.includes("chinaIndices")).map((market) => market.code).sort();
  assert.deepEqual(chinaIndexCodes, ["000016.SH", "000300.SH", "000510.SH", "000688.SH", "000852.SH", "000905.SH", "000985.SH", "399933.SZ", "399975.SZ", "399986.SZ", "399997.SZ", "930651.CSI", "930708.CSI", "930997.CSI", "931865.CSI", "SZ399006"]);
  assert.equal(dashboard.markets.find((market) => market.code === "000510.SH")?.providerSymbol, "000510.SH");
  assert.equal(dashboard.markets.find((market) => market.code === "930651.CSI")?.providerSymbol, "930651.CSI");
  assert.equal(dashboard.markets.find((market) => market.code === "930997.CSI")?.providerSymbol, "930997.CSI");
  const hkSelectedCodes = dashboard.markets.filter((market) => market.collections.includes("hkSelected")).map((market) => market.code).sort();
  assert.deepEqual(hkSelectedCodes, ["1093.HK", "1211.HK", "1299.HK", "16.HK", "1810.HK", "2.HK", "3690.HK", "388.HK", "5.HK", "700.HK", "883.HK", "939.HK", "941.HK", "9988.HK", "HSI", "HSTECH"]);
  for (const market of dashboard.markets) {
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
  assert.ok(btc?.collections.includes("crypto7"));
});
