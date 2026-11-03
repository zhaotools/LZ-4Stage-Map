// Index scan reuses the member-only market snapshots and their completed-week stage results.
const INDEX_CODES = {
  chinaIndices: new Set([
    "000984.SH", "SZ399006", "000688.SH", "000510.SH", "000300.SH", "000905.SH",
    "000852.SH", "000985.SH", "931865.CSI", "930651.CSI", "399986.SZ", "399975.SZ",
    "930708.CSI", "399997.SZ", "399933.SZ", "930997.CSI",
  ]),
  hkSelected: new Set(["HSI", "HSTECH", "HSEWI"]),
  usSelected: new Set(["GSPC.INDEX", "NDQ", "IWM", "RSP", "VIX", "SOXX", "XLF", "XLE", "XLV", "XLI", "XLY"]),
};

export const INDEX_SCAN_VIEWS = ["chinaIndices", "hkSelected", "usSelected"];

export function selectIndexScanMarkets(viewKey, markets) {
  const codes = INDEX_CODES[viewKey];
  if (!codes || !Array.isArray(markets)) return [];
  return markets.filter((market) => codes.has(market.code));
}

// Match the S2 rules used by the existing trend and stock scans.
export function matchS2ScanRules(market) {
  if (!market || !/^S[1-4]$/.test(market.stage)) return [];
  const matches = [];
  const observationPrimary = String(market.observationStage || "").match(/^S[1-4]/)?.[0];
  if (market.stage !== "S2" && observationPrimary === "S2") matches.push("s4Recovery");
  if (market.subStage === "S2A") matches.push("s2aEntry");
  if (market.stage === "S2" && Number.isFinite(market.weeks) && market.weeks <= 4) matches.push("s2Early");
  return matches;
}
