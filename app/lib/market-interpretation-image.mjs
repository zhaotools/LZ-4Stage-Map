import { STAGE_PRESENTATION } from "./stage-presentation.mjs";

const STAGE_COLORS = STAGE_PRESENTATION;

const FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif';

function percentage(count, total) {
  return total > 0 ? Math.round(count / total * 100) : 0;
}

function fallbackOverview(marketTitle, stageCounts, total) {
  const ranked = [...stageCounts].sort((a, b) => b.count - a.count);
  const [first, second] = ranked;
  const tied = first.count === second.count;
  const opposite = first.stage === "S2" ? stageCounts.find((item) => item.stage === "S4") : first.stage === "S4" ? stageCounts.find((item) => item.stage === "S2") : null;
  const headline = tied || first.count < total / 2
    ? `${marketTitle}呈现多阶段分化`
    : opposite && opposite.count / total >= 0.25
      ? `${first.stage} ${first.season}占优，但市场分化明显`
      : `${marketTitle}以${first.stage} ${first.season}为主`;
  const summary = tied
    ? `${total}个代表资产分布在多个阶段。`
    : `${total}个代表资产中，${first.count}个处于${first.stage}（${first.percent}%）${second.count ? `；${second.count}个处于${second.stage}（${second.percent}%）` : ""}。`;
  return { headline, summary };
}

function insightText(interpretation, ids) {
  for (const id of ids) {
    const match = interpretation.insights?.find((insight) => insight.id === id);
    if (match?.text) return match.text;
  }
  return "";
}

function assetNames(assets) {
  return assets.map((asset) => asset.name || asset.code).join("、");
}

function withoutObservationDisclaimer(text) {
  return text.replace(/\s*观察信号尚未等同于阶段确认。?/gu, "").trim();
}

function reportDateLabel(confirmationLabel) {
  const normalized = confirmationLabel
    .replace(/^(?:阶段)?数据(?:确认至|截至)[:：]?\s*/u, "")
    .replace(/^确认至\s*/u, "")
    .replace(/市场至\s*/gu, "市场 ");
  return `阶段数据截至：${normalized}`;
}

function changeLines(interpretation) {
  const confirmed = interpretation.confirmedChanges || [];
  const observations = interpretation.observations || [];
  const deltas = (interpretation.stageDistribution || []).filter((item) => item.delta !== 0);
  if (!confirmed.length && !observations.length) {
    const fallback = withoutObservationDisclaimer(insightText(interpretation, ["change", "observation"]));
    return [fallback || "本期没有已确认主阶段变化，也没有跨主阶段观察信号。"];
  }
  const lines = [];
  if (deltas.length) {
    lines.push(`阶段净变化：${deltas.map((item) => `${item.stage} ${item.delta > 0 ? "+" : ""}${item.delta}`).join("｜")}`);
  }
  if (confirmed.length) {
    lines.push(`已确认：${confirmed.map((item) => `${item.name || item.code} ${item.fromStage} → ${item.toStage}`).join("；")}`);
  } else {
    lines.push("已确认：本期没有主阶段变化");
  }
  if (observations.length) {
    lines.push(`观察：${observations.map((item) => `${item.name || item.code} ${item.fromStage} → ${item.toStage}观察（${item.status === "new" ? "新增" : "延续"}）`).join("；")}`);
  } else {
    lines.push("观察：当前没有跨主阶段观察信号");
  }
  return lines;
}

export function buildInterpretationImageModel(interpretation, marketTitle, confirmationLabel = `阶段数据截至：${interpretation.commonStageAsOf}`) {
  const total = interpretation.analyzedSize || Object.values(interpretation.stageCounts).reduce((sum, count) => sum + count, 0);
  const providedDistribution = new Map((interpretation.stageDistribution || []).map((item) => [item.stage, item]));
  const stageCounts = ["S1", "S2", "S3", "S4"].map((stage) => {
    const supplied = providedDistribution.get(stage);
    const count = supplied?.count ?? interpretation.stageCounts[stage] ?? 0;
    return {
      stage,
      label: `${STAGE_COLORS[stage].title} ${stage}｜${supplied?.season || STAGE_COLORS[stage].season}`,
      count,
      percent: supplied?.percent ?? percentage(count, total),
      delta: supplied?.delta ?? 0,
      season: STAGE_COLORS[stage].season,
      color: STAGE_COLORS[stage].color,
      background: STAGE_COLORS[stage].background,
    };
  });
  const marketStructure = interpretation.marketStructure || [];
  const keyPositions = interpretation.keyPositions || [];
  const dateMatches = confirmationLabel.match(/\d{4}-\d{2}-\d{2}/g);
  const overview = interpretation.schemaVersion === "lz-market-interpretation-v2"
    ? { headline: interpretation.headline, summary: interpretation.summary }
    : fallbackOverview(marketTitle, stageCounts, total);
  return {
    kicker: "LZ-4Stage Map · MARKET INTERPRETATION",
    title: `${marketTitle}阶段解读`,
    confirmationLabel,
    reportDateLabel: reportDateLabel(confirmationLabel),
    headline: overview.headline,
    summary: overview.summary,
    stageCounts,
    marketStructure,
    marketStructureFallback: marketStructure.length ? "" : insightText(interpretation, ["divergence", "structure"]) || `${marketTitle}样本按当前阶段分布展示。`,
    keyPositions,
    keyPositionsFallback: keyPositions.length ? "" : insightText(interpretation, ["maturity"]) || "当前没有需要单独标注的早期或后期阶段资产。",
    changeLines: changeLines(interpretation),
    quality: interpretation.excludedSize > 0
      ? `本期有${interpretation.excludedSize}个资产的数据尚未完成确认，未计入解读。`
      : "",
    source: "数据来自公开市场，由 LZ-4Stage 框架系统分析。",
    disclaimer: interpretation.note,
    detailUrl: "查看全球市场趋势地图：https://zhaotools.github.io/LZ-4Stage-Map/",
    fileDate: dateMatches?.at(-1) || interpretation.commonStageAsOf,
  };
}

function safeFileName(value) {
  return value.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
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

function paintCard(context, x, y, width, height, radius, background, border = "#e1e8f2") {
  roundRect(context, x, y, width, height, radius);
  context.fillStyle = background;
  context.fill();
  context.strokeStyle = border;
  context.lineWidth = 1.5;
  context.stroke();
}

function wrapText(context, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const character of Array.from(text)) {
    const candidate = line + character;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = character;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function wrapEntries(context, entries, maxWidth) {
  return entries.flatMap((entry) => wrapText(context, entry, maxWidth));
}

function fitLines(lines, maximum) {
  if (lines.length <= maximum) return lines;
  const visible = lines.slice(0, maximum);
  visible[maximum - 1] = `${visible[maximum - 1].replace(/[，；。、\s]+$/u, "")}…`;
  return visible;
}

function drawLines(context, lines, x, y, lineHeight, color) {
  context.fillStyle = color;
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
}

function downloadCanvas(canvas, fileName) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("图片生成失败"));
        return;
      }
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

function sectionLines(model, measure, widths) {
  measure.font = `20px ${FONT_FAMILY}`;
  const positionEntries = model.keyPositions.length
    ? model.keyPositions.map((group) => `${group.label}　${assetNames(group.assets)}`)
    : [model.keyPositionsFallback];
  return {
    market: fitLines(wrapText(measure, model.marketStructureFallback, widths.market - 56), 7),
    positions: fitLines(wrapEntries(measure, positionEntries, widths.positions - 56), 6),
    changes: fitLines(wrapEntries(measure, model.changeLines, widths.changes - 56), 4),
  };
}

function drawSection(context, { x, y, width, height, title, lines }) {
  paintCard(context, x, y, width, height, 16, "#fbfcfe", "#e1e8f2");
  context.fillStyle = STAGE_COLORS.S1.color;
  context.beginPath();
  context.arc(x + 30, y + 35, 6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#354964";
  context.font = `700 26px ${FONT_FAMILY}`;
  context.fillText(title, x + 50, y + 45);
  context.font = `20px ${FONT_FAMILY}`;
  const lineHeight = lines.length > 1
    ? Math.min(38, Math.max(26, (height - 114) / (lines.length - 1)))
    : 32;
  drawLines(context, lines, x + 28, y + 91, lineHeight, "#60718a");
}

function drawMarketStructureSection(context, { x, y, width, height, rows, fallbackLines }) {
  paintCard(context, x, y, width, height, 16, "#fbfcfe", "#e1e8f2");
  context.fillStyle = STAGE_COLORS.S1.color;
  context.beginPath();
  context.arc(x + 30, y + 35, 6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#354964";
  context.font = `700 26px ${FONT_FAMILY}`;
  context.fillText("市场结构", x + 50, y + 45);
  context.font = `20px ${FONT_FAMILY}`;
  if (!rows.length) {
    const lineHeight = fallbackLines.length > 1
      ? Math.min(38, Math.max(28, (height - 114) / (fallbackLines.length - 1)))
      : 32;
    drawLines(context, fallbackLines, x + 28, y + 91, lineHeight, "#60718a");
    return;
  }
  const rowStep = rows.length > 1
    ? Math.min(34, Math.max(28, (height - 116) / (Math.min(rows.length, 7) - 1)))
    : 32;
  const summaryX = x + Math.round(width * 0.5);
  rows.slice(0, 7).forEach((row, index) => {
    const rowY = y + 91 + index * rowStep;
    context.fillStyle = "#60718a";
    context.textAlign = "left";
    context.fillText(row.label, x + 28, rowY);
    context.fillStyle = "#354964";
    context.fillText(row.summary, summaryX, rowY);
  });
  context.textAlign = "left";
}

export async function downloadMarketInterpretationImage(interpretation, marketTitle, confirmationLabel) {
  if (typeof document === "undefined") throw new Error("当前环境无法生成图片");
  await document.fonts?.ready;

  const model = buildInterpretationImageModel(interpretation, marketTitle, confirmationLabel);
  const width = 1600;
  const height = 1000;
  const outerX = 24;
  const outerY = 24;
  const contentX = 72;
  const contentWidth = 1456;
  const gap = 18;
  const overviewWidth = 810;
  const changesWidth = contentWidth - overviewWidth - gap;
  const marketWidth = 690;
  const positionsWidth = contentWidth - marketWidth - gap;
  const measureCanvas = document.createElement("canvas");
  const measure = measureCanvas.getContext("2d");
  if (!measure) throw new Error("浏览器不支持图片生成");

  measure.font = `22px ${FONT_FAMILY}`;
  const summaryLines = fitLines(wrapText(measure, model.summary, overviewWidth - 56), 2);
  const sections = sectionLines(model, measure, { market: marketWidth, positions: positionsWidth, changes: changesWidth });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器不支持图片生成");

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#eef4ff");
  background.addColorStop(0.55, "#f7f9fc");
  background.addColorStop(1, "#eef8f3");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.shadowColor = "rgba(24, 50, 90, 0.12)";
  context.shadowBlur = 24;
  context.shadowOffsetY = 8;
  paintCard(context, outerX, outerY, width - outerX * 2, height - outerY * 2, 24, "#ffffff", "#dce5f1");
  context.shadowColor = "transparent";

  let y = 66;
  context.fillStyle = STAGE_COLORS.S1.color;
  context.font = `700 18px ${FONT_FAMILY}`;
  context.fillText(model.kicker, contentX, y);
  y += 54;
  context.fillStyle = "#122849";
  context.font = `700 46px ${FONT_FAMILY}`;
  context.fillText(model.title, contentX, y);
  context.fillStyle = "#6a7890";
  context.font = `600 20px ${FONT_FAMILY}`;
  context.textAlign = "right";
  context.fillText(model.reportDateLabel, contentX + contentWidth, y - 5);
  context.textAlign = "left";
  y += 34;

  const stageWidth = (contentWidth - gap * 3) / 4;
  model.stageCounts.forEach((item, index) => {
    const x = contentX + index * (stageWidth + gap);
    paintCard(context, x, y, stageWidth, 76, 13, item.background, "#e1e8f2");
    context.fillStyle = item.color;
    context.font = `700 24px ${FONT_FAMILY}`;
    context.fillText(item.label, x + 18, y + 48);
    context.fillStyle = "#42536d";
    context.font = `700 23px ${FONT_FAMILY}`;
    context.textAlign = "right";
    context.fillText(`${item.percent}%`, x + stageWidth - 18, y + 48);
    context.textAlign = "left";
  });
  y += 86;
  let barX = contentX;
  const total = Math.max(1, model.stageCounts.reduce((sum, stage) => sum + stage.count, 0));
  model.stageCounts.forEach((item) => {
    const barWidth = contentWidth * item.count / total;
    context.fillStyle = item.color;
    context.fillRect(barX, y, barWidth, 8);
    barX += barWidth;
  });
  y += 28;

  const firstRowHeight = 184;
  paintCard(context, contentX, y, overviewWidth, firstRowHeight, 16, "#f4f8ff", "#dce6f5");
  context.fillStyle = "#16315d";
  context.font = `700 34px ${FONT_FAMILY}`;
  context.fillText(model.headline, contentX + 28, y + 62);
  context.font = `22px ${FONT_FAMILY}`;
  drawLines(context, summaryLines, contentX + 28, y + 112, 34, "#5d6d85");
  drawSection(context, { x: contentX + overviewWidth + gap, y, width: changesWidth, height: firstRowHeight, title: "本期变化", lines: sections.changes });
  y += firstRowHeight + gap;

  const secondRowHeight = 318;
  drawMarketStructureSection(context, { x: contentX, y, width: marketWidth, height: secondRowHeight, rows: model.marketStructure, fallbackLines: sections.market });
  drawSection(context, { x: contentX + marketWidth + gap, y, width: positionsWidth, height: secondRowHeight, title: "关键位置", lines: sections.positions });

  if (model.quality) {
    y += secondRowHeight + 25;
    context.fillStyle = "#b56a08";
    context.font = `17px ${FONT_FAMILY}`;
    context.fillText(model.quality, contentX, y);
  }
  y = 838;
  context.strokeStyle = "#e2e8f1";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(contentX, y);
  context.lineTo(contentX + contentWidth, y);
  context.stroke();
  y += 37;
  context.fillStyle = "#294c82";
  context.font = `700 19px ${FONT_FAMILY}`;
  context.fillText(model.source, contentX, y);
  y += 36;
  context.fillStyle = "#96a2b4";
  context.font = `17px ${FONT_FAMILY}`;
  context.fillText(model.disclaimer, contentX, y);
  y += 36;
  context.fillStyle = STAGE_COLORS.S1.color;
  context.font = `17px ${FONT_FAMILY}`;
  context.fillText(model.detailUrl, contentX, y);

  const fileName = safeFileName(`LZ-4Stage-Map-${marketTitle}-阶段解读-${model.fileDate}.png`);
  return downloadCanvas(canvas, fileName);
}
