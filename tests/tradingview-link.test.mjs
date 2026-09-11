import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tradingViewChartUrlFor, tradingViewSymbolFor, chartLinkTitleFor } from "../app/lib/tradingview-link.mjs";

const market = (code, region, exchange) => ({ code, region, exchange });

test("maps every market family to its TradingView symbol", () => {
  assert.equal(tradingViewSymbolFor(market("GSPC.INDEX", "美股", "NYSE")), "SP:SPX");
  assert.equal(tradingViewSymbolFor(market("SOXX", "美股", "NASDAQ")), "NASDAQ:SOXX");
  assert.equal(tradingViewSymbolFor(market("IWM", "美股", "NYSEARCA")), "AMEX:IWM");
  assert.equal(tradingViewSymbolFor(market("BRK.B", "美股", "NYSE")), "NYSE:BRK.B");
  assert.equal(tradingViewSymbolFor(market("000300.SH", "A股", "CSI")), "SSE:000300");
  assert.equal(tradingViewSymbolFor(market("SZ399006", "A股", "SZSE")), "SZSE:399006");
  assert.equal(tradingViewSymbolFor(market("931865.CSI", "A股", "CSI")), "SSE:931865");
  assert.equal(tradingViewSymbolFor(market("700.HK", "港股", "HKEX")), "HKEX:700");
  assert.equal(tradingViewSymbolFor(market("HSTECH", "港股", "HKEX")), "HSI:HSTECH");
  assert.equal(tradingViewSymbolFor(market("N225", "日股", "OSE")), "TVC:NI225");
  assert.equal(tradingViewSymbolFor(market("US10Y", "大宗·宏观", "CBOE")), "TVC:US10Y");
  assert.equal(tradingViewSymbolFor(market("CL", "大宗·宏观", "NYMEX")), "NYMEX:CL1!");
  assert.equal(tradingViewSymbolFor(market("DJP", "大宗·宏观", "NYSEARCA")), "AMEX:DJP");
  assert.equal(tradingViewSymbolFor(market("XAG", "大宗·宏观", "COMEX")), "COMEX:SI1!");
  assert.equal(tradingViewSymbolFor(market("HG", "大宗·宏观", "COMEX")), "COMEX:HG1!");
  assert.equal(tradingViewSymbolFor(market("ALI", "大宗·宏观", "COMEX")), "COMEX:ALI1!");
  assert.equal(tradingViewSymbolFor(market("NG", "大宗·宏观", "NYMEX")), "NYMEX:NG1!");
  assert.equal(tradingViewSymbolFor(market("ZC", "大宗·宏观", "CBOT")), "CBOT:ZC1!");
  assert.equal(tradingViewSymbolFor(market("ZW", "大宗·宏观", "CBOT")), "CBOT:ZW1!");
  assert.equal(tradingViewSymbolFor(market("ZS", "大宗·宏观", "CBOT")), "CBOT:ZS1!");
  assert.equal(tradingViewSymbolFor(market("BTC-USD", "加密", "CRYPTO")), "BINANCE:BTCUSDT");
  assert.equal(tradingViewSymbolFor(market("HYPE-USD", "加密", "CRYPTO")), "HYPERLIQUID:HYPEUSDC");
});

test("builds an encoded TradingView chart URL", () => {
  assert.equal(
    tradingViewChartUrlFor(market("000300.SH", "A股", "CSI")),
    "https://cn.tradingview.com/chart/?symbol=SSE%3A000300&interval=D",
  );
});

test("member-selected assets use the server-validated TradingView identity", () => {
  const selected = { ...market("ABC-USD", "加密", "OKX"), tradingviewSymbol: "OKX:ABCUSDT" };
  assert.equal(tradingViewSymbolFor(selected), "OKX:ABCUSDT");
  assert.equal(tradingViewChartUrlFor(selected), "https://cn.tradingview.com/chart/?symbol=OKX%3AABCUSDT&interval=D");
});

test("HYPE opens TradingView Chinese daily chart with Hyperliquid spot feed", () => {
  const hype = market("HYPE-USD", "加密", "CRYPTO");
  assert.equal(tradingViewChartUrlFor(hype), "https://cn.tradingview.com/chart/?symbol=HYPERLIQUID%3AHYPEUSDC&interval=D");
  assert.match(chartLinkTitleFor(hype), /TradingView 中文站.*Hyperliquid.*现货日线/);
  assert.doesNotMatch(tradingViewChartUrlFor(hype), /app\.hyperliquid|okx|\.P/i);
});

test("all other assets retain their symbols and daily interval on the simplified Chinese site", () => {
  for (const asset of [market("BTC-USD", "加密", "CRYPTO"), market("700.HK", "港股", "HKEX"), market("AAPL", "美股", "NASDAQ"), market("000300.SH", "A股", "CSI")]) {
    const url = new URL(tradingViewChartUrlFor(asset));
    assert.equal(url.hostname, "cn.tradingview.com");
    assert.equal(url.searchParams.get("interval"), "D");
    assert.equal(url.searchParams.get("symbol"), tradingViewSymbolFor(asset));
  }
});

test("map tile clicks open TradingView in a separate tab", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /onClick=\{\(\) => onMarketTap\(item\)\}/);
  assert.match(source, /window\.open\(tradingViewChartUrlFor\(item\), "_blank", "noopener,noreferrer"\)/);
  assert.match(source, /点击在TradingView新标签页打开K线/);
});
