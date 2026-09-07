const specialSymbols = {
  "GSPC.INDEX": "SP:SPX",
  NDQ: "NASDAQ:NDX",
  VIX: "CBOE:VIX",
  HSI: "TVC:HSI",
  HSTECH: "HSI:HSTECH",
  N225: "TVC:NI225",
  STOXX50E: "TVC:SX5E",
  DXY: "TVC:DXY",
  US10Y: "TVC:US10Y",
  CL: "NYMEX:CL1!",
  XAU: "COMEX:GC1!",
  "BTC-USD": "BINANCE:BTCUSDT",
  "ETH-USD": "BINANCE:ETHUSDT",
  "SOL-USD": "BINANCE:SOLUSDT",
  "HYPE-USD": "HYPERLIQUID:HYPEUSDC",
  "BRK.B": "NYSE:BRK.B",
};

const tradingViewExchange = {
  NYSE: "NYSE",
  NASDAQ: "NASDAQ",
  CBOE: "CBOE",
  NYSEARCA: "AMEX",
};

export function tradingViewSymbolFor(market) {
  if (specialSymbols[market.code]) return specialSymbols[market.code];

  if (market.region === "港股") {
    const code = market.code.replace(/\.HK$/, "").replace(/^0+/, "") || "0";
    return `HKEX:${code}`;
  }

  if (market.region === "A股") {
    const code = market.code.replace(/^SZ/, "").replace(/\.(SH|SZ|CSI)$/, "");
    const exchange = market.code === "SZ399006" || market.code.endsWith(".SZ") ? "SZSE" : "SSE";
    return `${exchange}:${code}`;
  }

  if (market.region === "美股") {
    const exchange = tradingViewExchange[market.exchange] || market.exchange;
    return `${exchange}:${market.code}`;
  }

  return `TVC:${market.code}`;
}

export function tradingViewChartUrlFor(market) {
  return `https://cn.tradingview.com/chart/?symbol=${encodeURIComponent(tradingViewSymbolFor(market))}&interval=D`;
}

export function chartLinkTitleFor(market) {
  return market.code === "HYPE-USD" ? "在 TradingView 中文站查看 Hyperliquid HYPE/USDC 现货日线"
    : `在 TradingView 中文站查看 ${market.shortCode || market.code} 日线`;
}
