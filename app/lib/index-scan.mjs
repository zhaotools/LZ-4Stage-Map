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

const VIEW_BY_REGION = { A股: "chinaIndices", 港股: "hkSelected", 美股: "usSelected" };

export function resolveMapIndexLookup(region, input) {
  const viewKey = VIEW_BY_REGION[region];
  if (!viewKey) return null;
  const raw = String(input || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;
  let code;
  if (region === "A股") {
    const digits = raw.replace(/^(SH|SZ)/, "").replace(/\.(SH|SZ|CSI)$/, "");
    code = [...INDEX_CODES.chinaIndices].find((item) => item.replace(/^SZ/, "").replace(/\.(SH|SZ|CSI)$/, "") === digits
      && (raw === digits || raw === item || raw === `SH${digits}` && item.endsWith(".SH") || raw === `SZ${digits}` && (item === `SZ${digits}` || item.endsWith(".SZ")) || raw === `${digits}.SZ` && (item === `SZ${digits}` || item.endsWith(".SZ"))));
  } else if (region === "港股") {
    code = [...INDEX_CODES.hkSelected].find((item) => raw === item || raw === `^${item}`);
  } else {
    const aliases = { SPX: "GSPC.INDEX", GSPC: "GSPC.INDEX", "^GSPC": "GSPC.INDEX", "SP:SPX": "GSPC.INDEX", NDX: "NDQ", "^NDX": "NDQ", "NASDAQ:NDX": "NDQ" };
    const candidate = aliases[raw] || raw;
    code = INDEX_CODES.usSelected.has(candidate) ? candidate : null;
  }
  if (!code) return null;
  return {
    viewKey,
    code,
    assetKey: `MAP:${code}`,
    displayCode: code === "GSPC.INDEX" ? "SPX" : code === "NDQ" ? "NDX" : code.replace(/^SZ/, "").replace(/\.(SH|SZ|CSI)$/, ""),
  };
}

export function indexCodeOptionsFor(region) {
  const codes = INDEX_CODES[VIEW_BY_REGION[region]];
  if (!codes) return [];
  return [...codes].map((code) => resolveMapIndexLookup(region, code).displayCode);
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
