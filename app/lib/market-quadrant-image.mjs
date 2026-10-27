import { STAGE_PRESENTATION } from "./stage-presentation.mjs";

const FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif';
const STAGES = ["S1", "S2", "S3", "S4"];
const STAGE_AXIS_LABELS = { S1: "早期", S2: "发展期", S3: "观察期", S4: "下降期" };

const GROUPS = {
  global: [
    ["美股", "美股", "#e14655"],
    ["A股", "A股", "#2878df"],
    ["港股", "港股", "#8b5ac8"],
    ["日韩股市", "日韩股市", "#16a0a2"],
    ["欧股", "欧股", "#64748b"],
    ["大宗·宏观", "宏观商品", "#df7a24"],
    ["加密", "加密资产", "#2e9d58"],
  ],
  usSelected: [
    ["market", "市场", "#2878df"],
    ["sector", "行业", "#df7a24"],
    ["leaders", "核心资产", "#8b5ac8"],
    ["macro", "宏观", "#64748b"],
  ],
  chinaIndices: [
    ["market", "市场", "#2878df"],
    ["sector", "行业", "#f06423"],
  ],
  hkSelected: [
    ["index", "指数", "#2878df"],
    ["mega", "核心蓝筹", "#8b5ac8"],
    ["sector", "行业代表", "#df7a24"],
  ],
  commodity: [
    ["overall", "商品综合", "#64748b"],
    ["precious", "贵金属", "#c89421"],
    ["industrial", "工业金属", "#2878df"],
    ["energy", "能源", "#e14655"],
    ["agriculture", "农产品", "#2e9d58"],
  ],
  crypto7: [
    ["crypto", "加密资产", "#2e9d58"],
    ["stocks", "美股", "#e14655"],
  ],
};

const US_MARKET = new Set(["GSPC.INDEX", "NDQ", "RSP", "IWM", "VIX"]);
const US_SECTOR = new Set(["SOXX", "XLF", "XLE", "XLV", "XLI", "XLY"]);
const US_LEADERS = new Set(["NVDA", "MSFT", "AAPL", "AMZN", "TSLA", "BRK.B", "WMT"]);
const CHINA_MARKET = new Set(["000510.SH", "000300.SH", "000905.SH", "000852.SH", "000984.SH", "SZ399006", "000688.SH", "000985.SH"]);
const HK_INDEX = new Set(["HSI", "HSTECH", "HSEWI"]);
const HK_MEGA = new Set(["700.HK", "9988.HK", "5.HK", "1299.HK", "388.HK", "939.HK"]);
const COMMODITY_GROUPS = new Map([
  ["DJP", "overall"],
  ["XAU", "precious"], ["XAG", "precious"],
  ["HG", "industrial"], ["ALI", "industrial"],
  ["CL", "energy"], ["NG", "energy"],
  ["ZC", "agriculture"], ["ZW", "agriculture"], ["ZS", "agriculture"],
]);

function groupIdFor(market, viewKey) {
  if (viewKey === "global") return market.region;
  if (viewKey === "usSelected") {
    if (US_MARKET.has(market.code)) return "market";
    if (US_SECTOR.has(market.code)) return "sector";
    if (US_LEADERS.has(market.code)) return "leaders";
    return "macro";
  }
  if (viewKey === "chinaIndices") return CHINA_MARKET.has(market.code) ? "market" : "sector";
  if (viewKey === "hkSelected") {
    if (HK_INDEX.has(market.code)) return "index";
    return HK_MEGA.has(market.code) ? "mega" : "sector";
  }
  if (viewKey === "commodity") return COMMODITY_GROUPS.get(market.code) || "overall";
  if (viewKey === "crypto7") return market.region === "加密" ? "crypto" : "stocks";
  return market.region || "other";
}

function compactAssetName(market) {
  if (market.region === "加密") return market.shortCode || market.code.replace(/-USD$/u, "");
  const name = String(market.name || "")
    .replace(/（[^）]+）/gu, "")
    .replace(/(?:ETF|交易所交易基金)$/gu, "")
    .trim();
  return name && Array.from(name).length <= 8 ? name : market.shortCode || market.code;
}

function niceAxis(maximum) {
  const max = Math.max(1, maximum);
  const roughStep = max / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const step = (normalized <= 1.5 ? 1 : normalized <= 3 ? 2 : normalized <= 7 ? 5 : 10) * magnitude;
  const axisMax = Math.max(step * 5, Math.ceil(max / step) * step);
  const ticks = [];
  for (let value = 0; value <= axisMax + step / 2; value += step) ticks.push(Number(value.toFixed(8)));
  return { max: axisMax, step, ticks };
}

function reportDate(confirmationLabel, fallback = "") {
  return confirmationLabel.match(/\d{4}-\d{2}-\d{2}/gu)?.at(-1) || fallback;
}

function safeFileName(value) {
  return value.replace(/[\\/:*?"<>|\s]+/gu, "-").replace(/-+/gu, "-").replace(/^-|-$/gu, "");
}

export function buildMarketQuadrantModel(markets, viewKey, marketTitle, confirmationLabel) {
  const validMarkets = markets.filter((market) => STAGES.includes(market.stage)
    && Number.isFinite(Number(market.weeks))
    && market.cryptoFreshness !== "unavailable");
  const definitions = GROUPS[viewKey] || [];
  const definitionMap = new Map(definitions.map(([id, label, color]) => [id, { id, label, color }]));
  const stageSlots = new Map();
  const points = validMarkets.map((market) => {
    const groupId = groupIdFor(market, viewKey);
    const group = definitionMap.get(groupId) || { id: groupId, label: groupId, color: "#64748b" };
    const index = stageSlots.get(market.stage) || 0;
    stageSlots.set(market.stage, index + 1);
    const jitter = [0, 0.1, -0.1, 0.19, -0.19, 0.145, -0.145, 0.05, -0.05][index % 9];
    const weeks = Math.max(0, Math.round(Number(market.weeks)));
    return {
      code: market.code,
      name: compactAssetName(market),
      shortCode: market.shortCode || market.code,
      stage: market.stage,
      subStage: market.subStage || market.stage,
      stageValue: Number(market.stage.slice(1)),
      yValue: Number(market.stage.slice(1)) + jitter,
      weeks,
      label: `${compactAssetName(market)}｜${market.subStage || market.stage}｜${weeks}周`,
      groupId: group.id,
      groupLabel: group.label,
      color: group.color,
    };
  });
  const counts = new Map(points.map((point) => [point.groupId, 0]));
  points.forEach((point) => counts.set(point.groupId, (counts.get(point.groupId) || 0) + 1));
  const groups = definitions
    .map(([id, label, color]) => ({ id, label, color, count: counts.get(id) || 0 }))
    .filter((group) => group.count > 0);
  const xAxis = niceAxis(Math.max(0, ...points.map((point) => point.weeks)));
  const fileDate = reportDate(confirmationLabel, validMarkets.map((market) => market.stageAsOf).sort().at(-1) || "");
  return {
    title: `${marketTitle}${points.length}个资产阶段象限图`,
    subtitle: "X轴：主阶段持续时间（周）｜Y轴：当前阶段（S1–S4）",
    confirmationLabel,
    fileDate,
    points,
    groups,
    xAxis,
    stages: [...STAGES].reverse().map((stage) => ({
      stage,
      value: Number(stage.slice(1)),
      title: STAGE_PRESENTATION[stage].title,
      season: STAGE_PRESENTATION[stage].season,
      axisLabel: STAGE_AXIS_LABELS[stage],
      color: STAGE_PRESENTATION[stage].color,
      background: STAGE_PRESENTATION[stage].background,
    })),
  };
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function intersects(left, right, padding = 7) {
  return left.x < right.x + right.width + padding
    && left.x + left.width + padding > right.x
    && left.y < right.y + right.height + padding
    && left.y + left.height + padding > right.y;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function overlapArea(left, right, padding = 7) {
  const width = Math.max(0, Math.min(left.x + left.width + padding, right.x + right.width + padding)
    - Math.max(left.x - padding, right.x - padding));
  const height = Math.max(0, Math.min(left.y + left.height + padding, right.y + right.height + padding)
    - Math.max(left.y - padding, right.y - padding));
  return width * height;
}

function placeLabel(point, labelWidth, plot, occupied, markerBoxes) {
  const bandTop = plot.y + (4 - point.stageValue) * plot.bandHeight;
  const bandBottom = bandTop + plot.bandHeight;
  const height = 38;
  const inset = 6;
  const collisionPadding = 7;
  const minX = plot.x + inset;
  const maxX = plot.x + plot.width - labelWidth - inset;
  const minY = bandTop + inset;
  const maxY = bandBottom - height - inset;
  const rowGap = collisionPadding;
  const rowCount = Math.max(1, Math.floor((maxY - minY + height + rowGap) / (height + rowGap)));
  const rowYs = Array.from({ length: rowCount }, (_, index) => minY + index * (height + rowGap));
  const preferredXs = [
    point.pixelX + 18,
    point.pixelX - labelWidth - 18,
    point.pixelX - labelWidth / 2,
  ];
  const xSeeds = [minX, maxX, ...preferredXs];
  occupied.forEach((box) => {
    xSeeds.push(box.x + box.width + collisionPadding, box.x - labelWidth - collisionPadding);
  });
  for (let x = minX; x <= maxX; x += 8) xSeeds.push(x);
  const uniqueXs = [...new Set(xSeeds.map((x) => Math.round(clamp(x, minX, maxX))))];
  const candidates = rowYs.flatMap((y) => uniqueXs.map((x) => {
    const anchorX = clamp(point.pixelX, x, x + labelWidth);
    const anchorY = clamp(point.pixelY, y, y + height);
    const connectorLength = Math.hypot(point.pixelX - anchorX, point.pixelY - anchorY);
    const centerDistance = Math.abs(point.pixelX - (x + labelWidth / 2));
    const box = { x, y, width: labelWidth, height };
    const markerPenalty = markerBoxes.reduce((sum, marker) => sum + overlapArea(box, marker, 3), 0);
    const coversOwnPoint = point.pixelX >= x && point.pixelX <= x + labelWidth
      && point.pixelY >= y && point.pixelY <= y + height;
    return {
      ...box,
      score: connectorLength * 10 + centerDistance + markerPenalty * 4 + (coversOwnPoint ? 10000 : 0),
    };
  })).sort((left, right) => left.score - right.score || left.y - right.y || left.x - right.x);
  const placed = candidates.find((candidate) => occupied.every((box) => !intersects(candidate, box, collisionPadding)))
    || candidates.reduce((best, candidate) => {
      const collisionScore = occupied.reduce((sum, box) => sum + overlapArea(candidate, box, collisionPadding), 0);
      if (!best || collisionScore < best.collisionScore
        || (collisionScore === best.collisionScore && candidate.score < best.candidate.score)) {
        return { candidate, collisionScore };
      }
      return best;
    }, null).candidate;
  occupied.push(placed);
  return placed;
}

export function layoutMarketQuadrantLabels(points, plot, measureText) {
  const markerBoxes = points.map((point) => ({
    x: point.pixelX - 14,
    y: point.pixelY - 14,
    width: 28,
    height: 28,
  }));
  const occupied = [];
  return points.map((point) => {
    const labelWidth = Math.min(260, Math.max(124, measureText(point.label).width + 26));
    return { ...point, labelBox: placeLabel(point, labelWidth, plot, occupied, markerBoxes) };
  });
}

function drawConnector(context, point, box) {
  const anchorX = clamp(point.pixelX, box.x, box.x + box.width);
  const anchorY = clamp(point.pixelY, box.y, box.y + box.height);
  context.strokeStyle = point.color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(point.pixelX, point.pixelY);
  context.lineTo(anchorX, anchorY);
  context.stroke();
}

function drawLegend(context, groups, width, y) {
  context.font = `700 21px ${FONT_FAMILY}`;
  const items = groups.map((group) => ({ ...group, width: context.measureText(`${group.label}（${group.count}个）`).width + 62 }));
  const gap = 22;
  const totalWidth = items.reduce((sum, item) => sum + item.width, 0) + Math.max(0, items.length - 1) * gap;
  let x = Math.max(50, (width - totalWidth) / 2);
  items.forEach((item) => {
    context.fillStyle = item.color;
    context.beginPath();
    context.arc(x + 14, y - 7, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#243751";
    context.fillText(`${item.label}（${item.count}个）`, x + 35, y);
    x += item.width + gap;
  });
}

function downloadCanvas(canvas, fileName) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("象限图生成失败"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(fileName);
    }, "image/png");
  });
}

export async function downloadMarketQuadrantImage(markets, viewKey, marketTitle, confirmationLabel) {
  if (typeof document === "undefined") throw new Error("当前环境无法生成象限图");
  await document.fonts?.ready;
  const model = buildMarketQuadrantModel(markets, viewKey, marketTitle, confirmationLabel);
  if (!model.points.length) throw new Error("当前没有可用于象限图的阶段数据");

  const width = 1600;
  const height = 1200;
  const plot = { x: 154, y: 168, width: 1376, height: 760, bandHeight: 190 };
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器不支持象限图生成");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#ffffff");
  background.addColorStop(1, "#f7f9fc");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.textAlign = "center";
  context.fillStyle = "#10294f";
  context.font = `700 52px ${FONT_FAMILY}`;
  context.fillText(model.title, width / 2, 68);
  context.fillStyle = "#526681";
  context.font = `600 24px ${FONT_FAMILY}`;
  context.fillText(model.subtitle, width / 2, 116);

  model.stages.forEach((stage, index) => {
    const bandY = plot.y + index * plot.bandHeight;
    context.fillStyle = stage.background;
    context.fillRect(plot.x, bandY, plot.width, plot.bandHeight);
    context.fillStyle = stage.color;
    context.font = `800 34px ${FONT_FAMILY}`;
    context.textAlign = "right";
    context.fillText(stage.stage, plot.x - 40, bandY + plot.bandHeight / 2 - 7);
    context.fillStyle = "#5c6f89";
    context.font = `600 17px ${FONT_FAMILY}`;
    context.fillText(`（${stage.axisLabel}）`, plot.x - 40, bandY + plot.bandHeight / 2 + 26);
  });

  context.setLineDash([6, 6]);
  context.lineWidth = 1;
  model.xAxis.ticks.forEach((tick) => {
    const x = plot.x + tick / model.xAxis.max * plot.width;
    context.strokeStyle = tick === 0 ? "#203a60" : "#cbd5e1";
    context.beginPath();
    context.moveTo(x, plot.y);
    context.lineTo(x, plot.y + plot.height);
    context.stroke();
    context.fillStyle = "#263b59";
    context.font = `600 18px ${FONT_FAMILY}`;
    context.textAlign = "center";
    context.fillText(String(tick), x, plot.y + plot.height + 34);
  });
  for (let stage = 1; stage <= 4; stage += 1) {
    const y = plot.y + (4.5 - stage) / 4 * plot.height;
    context.strokeStyle = "#cbd5e1";
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(plot.x + plot.width, y);
    context.stroke();
  }
  context.setLineDash([]);
  context.strokeStyle = "#203a60";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(plot.x, plot.y);
  context.lineTo(plot.x, plot.y + plot.height);
  context.lineTo(plot.x + plot.width, plot.y + plot.height);
  context.stroke();

  context.fillStyle = "#263b59";
  context.font = `700 22px ${FONT_FAMILY}`;
  context.textAlign = "center";
  context.fillText("主阶段持续时间（周）", plot.x + plot.width / 2, plot.y + plot.height + 78);
  context.save();
  context.translate(38, plot.y + plot.height / 2);
  context.rotate(-Math.PI / 2);
  context.fillText("当前阶段", 0, 0);
  context.restore();

  const pointsWithPixels = model.points.map((point) => ({
    ...point,
    pixelX: plot.x + point.weeks / model.xAxis.max * plot.width,
    pixelY: plot.y + (4.5 - point.yValue) / 4 * plot.height,
  })).sort((left, right) => right.stageValue - left.stageValue || left.weeks - right.weeks);
  context.font = `700 18px ${FONT_FAMILY}`;
  const points = layoutMarketQuadrantLabels(pointsWithPixels, plot, (label) => context.measureText(label));
  points.forEach((point) => drawConnector(context, point, point.labelBox));
  points.forEach((point) => {
    roundRect(context, point.labelBox.x, point.labelBox.y, point.labelBox.width, point.labelBox.height, 9);
    context.fillStyle = "rgba(255,255,255,0.94)";
    context.fill();
    context.strokeStyle = point.color;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#1c2e49";
    context.font = `700 18px ${FONT_FAMILY}`;
    context.textAlign = "left";
    context.fillText(point.label, point.labelBox.x + 13, point.labelBox.y + 27);
  });
  points.forEach((point) => {
    context.fillStyle = point.color;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(point.pixelX, point.pixelY, 12, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  drawLegend(context, model.groups, width, 1064);
  context.fillStyle = "#748298";
  context.font = `17px ${FONT_FAMILY}`;
  context.textAlign = "left";
  context.fillText(model.confirmationLabel, 70, 1152);
  context.textAlign = "right";
  context.fillText("阶段分析仅供市场观察，不构成任何投资建议", width - 70, 1152);

  const fileName = safeFileName(`LZ-4Stage-Map-${marketTitle}-阶段象限图-${model.fileDate}.png`);
  return downloadCanvas(canvas, fileName);
}
