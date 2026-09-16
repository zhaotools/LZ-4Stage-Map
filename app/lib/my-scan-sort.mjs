export const MY_SCAN_SORT_MODES = ["added", "stageAsc", "stageDesc", "region", "code"];

const REGION_ORDER = new Map([
  ["美股", 0],
  ["A股", 1],
  ["港股", 2],
  ["加密", 3],
]);

const STAGE_ORDER = new Map([
  ["S1", 1],
  ["S2", 2],
  ["S3", 3],
  ["S4", 4],
]);

function compareCode(left, right) {
  return String(left.displayCode || left.code || "").localeCompare(
    String(right.displayCode || right.code || ""),
    "zh-CN",
    { numeric: true, sensitivity: "base" },
  );
}

function stageRank(asset, descending) {
  const rank = STAGE_ORDER.get(asset.result?.stage);
  if (!rank) return 99;
  return descending ? 5 - rank : rank;
}

export function sortMyScanAssets(assets, mode = "added") {
  const sorted = [...assets];
  if (mode === "added") {
    return sorted.sort((left, right) => Date.parse(left.createdAt || "") - Date.parse(right.createdAt || "") || compareCode(left, right));
  }
  if (mode === "stageAsc" || mode === "stageDesc") {
    const descending = mode === "stageDesc";
    return sorted.sort((left, right) => stageRank(left, descending) - stageRank(right, descending) || compareCode(left, right));
  }
  if (mode === "region") {
    return sorted.sort((left, right) => (REGION_ORDER.get(left.region) ?? 99) - (REGION_ORDER.get(right.region) ?? 99) || compareCode(left, right));
  }
  if (mode === "code") return sorted.sort(compareCode);
  return sorted;
}
