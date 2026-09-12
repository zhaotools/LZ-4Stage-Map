const STAGE_COLORS = {
  S1: { season: "春季", color: "#397ff6", background: "#eef4ff" },
  S2: { season: "夏季", color: "#18a567", background: "#eefaf4" },
  S3: { season: "秋季", color: "#f09a18", background: "#fff7e8" },
  S4: { season: "冬季", color: "#ed4859", background: "#fff1f3" },
};

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
    .replace(/^数据确认至\s*/u, "")
    .replace(/^确认至\s*/u, "")
    .replace(/市场至\s*/gu, "市场 ");
  return `数据截至：${normalized}`;
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

export function buildInterpretationImageModel(interpretation, marketTitle, confirmationLabel = `数据确认至 ${interpretation.commonStageAsOf}`) {
  const total = interpretation.analyzedSize || Object.values(interpretation.stageCounts).reduce((sum, count) => sum + count, 0);
  const providedDistribution = new Map((interpretation.stageDistribution || []).map((item) => [item.stage, item]));
  const stageCounts = ["S1", "S2", "S3", "S4"].map((stage) => {
    const supplied = providedDistribution.get(stage);
    const count = supplied?.count ?? interpretation.stageCounts[stage] ?? 0;
    return {
      stage,
      label: `${stage} ${supplied?.season || STAGE_COLORS[stage].season}`,
      count,
      percent: supplied?.percent ?? percentage(count, total),
      delta: supplied?.delta ?? 0,
      ...STAGE_COLORS[stage],
    };
  });
  const marketStructure = interpretation.marketStructure || [];
  const keyPositions = interpretation.keyPositions || [];
  const dateMatches = confirmationLabel.match(/\d{4}-\d{2}-\d{2}/g);
  const overview = interpretation.schemaVersion === "lz-market-interpretation-v2"
    ? { headline: interpretation.headline, summary: interpretation.summary }
    : fallbackOverview(marketTitle, stageCounts, total);
  return {
    kicker: "LZ-4STAGE · MARKET INTERPRETATION",
    title: `${marketTitle}四季解读`,
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
    detailUrl: "阶段地图详情：https://zhaotools.github.io/LZ-4Stage-Map/",
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

function sectionLines(model, measure, contentWidth) {
  measure.font = `28px ${FONT_FAMILY}`;
  const lineWidth = contentWidth - 64;
  const marketEntries = model.marketStructure.length
    ? model.marketStructure.map((row) => `${row.label}　${row.summary}`)
    : [model.marketStructureFallback];
  const positionEntries = model.keyPositions.length
    ? model.keyPositions.map((group) => `${group.label}　${assetNames(group.assets)}`)
    : [model.keyPositionsFallback];
  return {
    market: fitLines(wrapEntries(measure, marketEntries, lineWidth), 7),
    positions: fitLines(wrapEntries(measure, positionEntries, lineWidth), 5),
    changes: fitLines(wrapEntries(measure, model.changeLines, lineWidth), 5),
  };
}

function drawSection(context, { x, y, width, height, title, lines }) {
  paintCard(context, x, y, width, height, 20, "#fbfcfe", "#e1e8f2");
  context.fillStyle = "#397ff6";
  context.beginPath();
  context.arc(x + 34, y + 42, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#354964";
  context.font = `700 34px ${FONT_FAMILY}`;
  context.fillText(title, x + 56, y + 58);
  context.font = `28px ${FONT_FAMILY}`;
  const lineHeight = lines.length > 1
    ? Math.min(56, Math.max(46, (height - 154) / (lines.length - 1)))
    : 48;
  drawLines(context, lines, x + 32, y + 118, lineHeight, "#60718a");
}

function drawMarketStructureSection(context, { x, y, width, height, rows, fallbackLines }) {
  paintCard(context, x, y, width, height, 20, "#fbfcfe", "#e1e8f2");
  context.fillStyle = "#397ff6";
  context.beginPath();
  context.arc(x + 34, y + 42, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#354964";
  context.font = `700 34px ${FONT_FAMILY}`;
  context.fillText("市场结构", x + 56, y + 58);
  context.font = `28px ${FONT_FAMILY}`;
  if (!rows.length) {
    const lineHeight = fallbackLines.length > 1
      ? Math.min(56, Math.max(46, (height - 154) / (fallbackLines.length - 1)))
      : 48;
    drawLines(context, fallbackLines, x + 32, y + 118, lineHeight, "#60718a");
    return;
  }
  const rowStep = rows.length > 1
    ? Math.min(52, Math.max(42, (height - 154) / (Math.min(rows.length, 7) - 1)))
    : 48;
  rows.slice(0, 7).forEach((row, index) => {
    const rowY = y + 118 + index * rowStep;
    context.fillStyle = "#60718a";
    context.textAlign = "left";
    context.fillText(row.label, x + 32, rowY);
    context.fillStyle = "#354964";
    context.fillText(row.summary, x + 288, rowY);
  });
  context.textAlign = "left";
}

export async function downloadMarketInterpretationImage(interpretation, marketTitle, confirmationLabel) {
  if (typeof document === "undefined") throw new Error("当前环境无法生成图片");
  await document.fonts?.ready;

  const model = buildInterpretationImageModel(interpretation, marketTitle, confirmationLabel);
  const width = 1080;
  const height = 1920;
  const outerX = 28;
  const outerY = 28;
  const contentX = 70;
  const contentWidth = 940;
  const gap = 20;
  const measureCanvas = document.createElement("canvas");
  const measure = measureCanvas.getContext("2d");
  if (!measure) throw new Error("浏览器不支持图片生成");

  measure.font = `30px ${FONT_FAMILY}`;
  const summaryLines = wrapText(measure, model.summary, contentWidth - 48);
  const sections = sectionLines(model, measure, contentWidth);
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
  context.shadowBlur = 30;
  context.shadowOffsetY = 10;
  paintCard(context, outerX, outerY, width - outerX * 2, height - outerY * 2, 28, "#ffffff", "#dce5f1");
  context.shadowColor = "transparent";

  let y = 88;
  context.fillStyle = "#397ff6";
  context.font = `700 22px ${FONT_FAMILY}`;
  context.fillText(model.kicker, contentX, y);
  y += 72;
  context.fillStyle = "#122849";
  context.font = `700 56px ${FONT_FAMILY}`;
  context.fillText(model.title, contentX, y);
  context.fillStyle = "#6a7890";
  context.font = `600 24px ${FONT_FAMILY}`;
  context.fillText(model.reportDateLabel, contentX, y + 46);
  y += 86;

  const stageWidth = (contentWidth - gap * 3) / 4;
  model.stageCounts.forEach((item, index) => {
    const x = contentX + index * (stageWidth + gap);
    paintCard(context, x, y, stageWidth, 102, 16, item.background, "#e1e8f2");
    context.fillStyle = item.color;
    context.font = `700 27px ${FONT_FAMILY}`;
    context.fillText(item.label, x + 16, y + 62);
    context.fillStyle = "#42536d";
    context.font = `700 25px ${FONT_FAMILY}`;
    context.textAlign = "right";
    context.fillText(`${item.percent}%`, x + stageWidth - 16, y + 62);
    context.textAlign = "left";
  });
  y += 116;
  let barX = contentX;
  const total = Math.max(1, model.stageCounts.reduce((sum, stage) => sum + stage.count, 0));
  model.stageCounts.forEach((item) => {
    const barWidth = contentWidth * item.count / total;
    context.fillStyle = item.color;
    context.fillRect(barX, y, barWidth, 10);
    barX += barWidth;
  });
  y += 42;

  const sectionGap = 26;
  const footerDividerY = height - outerY - 180;
  const qualityReserve = model.quality ? 48 : 0;
  const contentBottom = footerDividerY - 26 - qualityReserve;
  const marketLineCount = model.marketStructure.length || sections.market.length;
  const minimumHeights = [
    Math.max(184, 154 + Math.max(0, summaryLines.length - 1) * 50),
    Math.max(220, 154 + Math.max(0, marketLineCount - 1) * 46),
    Math.max(210, 154 + Math.max(0, sections.positions.length - 1) * 48),
    Math.max(226, 154 + Math.max(0, sections.changes.length - 1) * 48),
  ];
  const availableHeight = contentBottom - y - sectionGap * 3;
  const minimumTotal = minimumHeights.reduce((sum, value) => sum + value, 0);
  const extraHeight = Math.max(0, availableHeight - minimumTotal);
  const minimumWeight = Math.max(1, minimumTotal);
  const [overviewHeight, marketHeight, positionsHeight, changesHeight] = minimumHeights.map((value, index) => {
    if (!extraHeight) return value;
    const share = index === minimumHeights.length - 1
      ? extraHeight - minimumHeights.slice(0, -1).reduce((sum, item) => sum + Math.round(extraHeight * item / minimumWeight), 0)
      : Math.round(extraHeight * value / minimumWeight);
    return value + share;
  });

  paintCard(context, contentX, y, contentWidth, overviewHeight, 20, "#f4f8ff", "#dce6f5");
  context.fillStyle = "#16315d";
  context.font = `700 42px ${FONT_FAMILY}`;
  context.fillText(model.headline, contentX + 30, y + 70);
  context.font = `30px ${FONT_FAMILY}`;
  drawLines(context, summaryLines, contentX + 30, y + 132, 50, "#5d6d85");
  y += overviewHeight + sectionGap;

  drawMarketStructureSection(context, { x: contentX, y, width: contentWidth, height: marketHeight, rows: model.marketStructure, fallbackLines: sections.market });
  y += marketHeight + sectionGap;
  drawSection(context, { x: contentX, y, width: contentWidth, height: positionsHeight, title: "关键位置", lines: sections.positions });
  y += positionsHeight + sectionGap;
  drawSection(context, { x: contentX, y, width: contentWidth, height: changesHeight, title: "本期变化", lines: sections.changes });
  y += changesHeight;

  if (model.quality) {
    y += 34;
    context.fillStyle = "#b56a08";
    context.font = `24px ${FONT_FAMILY}`;
    context.fillText(model.quality, contentX, y);
  }
  y = footerDividerY;
  context.strokeStyle = "#e2e8f1";
  context.beginPath();
  context.moveTo(contentX, y);
  context.lineTo(contentX + contentWidth, y);
  context.stroke();
  y += 43;
  context.fillStyle = "#294c82";
  context.font = `700 24px ${FONT_FAMILY}`;
  context.fillText(model.source, contentX, y);
  y += 40;
  context.fillStyle = "#96a2b4";
  context.font = `22px ${FONT_FAMILY}`;
  context.fillText(model.disclaimer, contentX, y);
  y += 40;
  context.fillStyle = "#397ff6";
  context.font = `22px ${FONT_FAMILY}`;
  context.fillText(model.detailUrl, contentX, y);

  const fileName = safeFileName(`LZ-4Stage-${marketTitle}-四季解读-${model.fileDate}.png`);
  return downloadCanvas(canvas, fileName);
}
