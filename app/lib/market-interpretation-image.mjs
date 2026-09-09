const STAGE_COLORS = {
  S1: { season: "春季", color: "#397ff6", background: "#eef4ff" },
  S2: { season: "夏季", color: "#18a567", background: "#eefaf4" },
  S3: { season: "秋季", color: "#f09a18", background: "#fff7e8" },
  S4: { season: "冬季", color: "#ed4859", background: "#fff1f3" },
};

const INSIGHT_COLORS = {
  structure: { color: "#397ff6", background: "#eef4ff" },
  maturity: { color: "#18a567", background: "#eefaf4" },
  observation: { color: "#f09a18", background: "#fff7e8" },
  divergence: { color: "#ed4859", background: "#fff1f3" },
};

const FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif';

function formatShanghaiDate(value) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")}`;
}

export function buildInterpretationImageModel(interpretation, marketTitle, imageGeneratedAt = new Date()) {
  return {
    kicker: "LZ-4STAGE · MARKET INTERPRETATION",
    title: `${marketTitle}阶段解读`,
    mode: "系统解读",
    headline: interpretation.headline,
    summary: interpretation.summary,
    stageCounts: ["S1", "S2", "S3", "S4"].map((stage) => ({
      stage,
      label: `${stage} ${STAGE_COLORS[stage].season}`,
      count: interpretation.stageCounts[stage] ?? 0,
      ...STAGE_COLORS[stage],
    })),
    insights: interpretation.insights.map((insight) => ({
      ...insight,
      ...(INSIGHT_COLORS[insight.id] ?? { color: "#60718a", background: "#f5f7fa" }),
    })),
    quality: interpretation.excludedSize > 0
      ? `本期有${interpretation.excludedSize}个资产的数据尚未完成确认，未计入解读。`
      : "",
    time: `数据确认至 ${interpretation.commonStageAsOf} · 图片生成于 ${formatShanghaiDate(imageGeneratedAt)}`,
    source: "数据来自公开市场，由 LZ-4Stage 框架系统分析。",
    disclaimer: interpretation.note,
    detailUrl: "阶段地图详情：https://zhaotools.github.io/LZ-4Stage-Map/",
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

export async function downloadMarketInterpretationImage(interpretation, marketTitle) {
  if (typeof document === "undefined") throw new Error("当前环境无法生成图片");
  await document.fonts?.ready;

  const model = buildInterpretationImageModel(interpretation, marketTitle);
  const width = 1200;
  const outerX = 38;
  const outerY = 38;
  const contentX = 80;
  const contentWidth = 1040;
  const gap = 18;
  const cardWidth = (contentWidth - gap) / 2;
  const measureCanvas = document.createElement("canvas");
  const measure = measureCanvas.getContext("2d");
  if (!measure) throw new Error("浏览器不支持图片生成");

  measure.font = `24px ${FONT_FAMILY}`;
  const summaryLines = wrapText(measure, model.summary, contentWidth - 48);
  const insightLayouts = model.insights.map((insight) => {
    measure.font = `23px ${FONT_FAMILY}`;
    return { ...insight, lines: wrapText(measure, insight.text, cardWidth - 52) };
  });
  const rows = [];
  for (let index = 0; index < insightLayouts.length; index += 2) {
    const cards = insightLayouts.slice(index, index + 2);
    rows.push({ cards, height: Math.max(160, ...cards.map((card) => 82 + card.lines.length * 36)) });
  }

  const overviewHeight = 118 + summaryLines.length * 38;
  const insightsHeight = rows.reduce((sum, row) => sum + row.height, 0) + Math.max(0, rows.length - 1) * gap;
  const qualityHeight = model.quality ? 42 : 0;
  const height = 38 + 156 + 86 + 24 + overviewHeight + 24 + insightsHeight + qualityHeight + 218 + 38;
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

  let y = 82;
  context.fillStyle = "#397ff6";
  context.font = `700 18px ${FONT_FAMILY}`;
  context.fillText(model.kicker, contentX, y);
  y += 54;
  context.fillStyle = "#122849";
  context.font = `700 42px ${FONT_FAMILY}`;
  context.fillText(model.title, contentX, y);
  const modeWidth = 132;
  paintCard(context, contentX + contentWidth - modeWidth, y - 39, modeWidth, 48, 14, "#f2f6fc", "#d5dfed");
  context.fillStyle = "#52647f";
  context.font = `700 20px ${FONT_FAMILY}`;
  context.textAlign = "center";
  context.fillText(model.mode, contentX + contentWidth - modeWidth / 2, y - 7);
  context.textAlign = "left";
  y += 44;

  const stageWidth = (contentWidth - gap * 3) / 4;
  model.stageCounts.forEach((item, index) => {
    const x = contentX + index * (stageWidth + gap);
    paintCard(context, x, y, stageWidth, 70, 14, item.background, "#e1e8f2");
    context.fillStyle = item.color;
    context.font = `700 25px ${FONT_FAMILY}`;
    context.fillText(item.label, x + 20, y + 44);
    context.fillStyle = "#42536d";
    context.font = `700 21px ${FONT_FAMILY}`;
    context.textAlign = "right";
    context.fillText(`${item.count} 个`, x + stageWidth - 20, y + 43);
    context.textAlign = "left";
  });
  y += 94;

  paintCard(context, contentX, y, contentWidth, overviewHeight, 18, "#f4f8ff", "#dce6f5");
  context.fillStyle = "#16315d";
  context.font = `700 31px ${FONT_FAMILY}`;
  context.fillText(model.headline, contentX + 24, y + 48);
  context.font = `24px ${FONT_FAMILY}`;
  drawLines(context, summaryLines, contentX + 24, y + 92, 38, "#5d6d85");
  y += overviewHeight + 24;

  for (const row of rows) {
    row.cards.forEach((card, index) => {
      const x = contentX + index * (cardWidth + gap);
      paintCard(context, x, y, cardWidth, row.height, 17, card.background, "#e1e8f2");
      context.fillStyle = card.color;
      context.beginPath();
      context.arc(x + 28, y + 35, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#354964";
      context.font = `700 24px ${FONT_FAMILY}`;
      context.fillText(card.label, x + 46, y + 43);
      context.font = `23px ${FONT_FAMILY}`;
      drawLines(context, card.lines, x + 26, y + 82, 36, "#60718a");
    });
    y += row.height + gap;
  }
  y -= gap;

  if (model.quality) {
    y += 34;
    context.fillStyle = "#b56a08";
    context.font = `20px ${FONT_FAMILY}`;
    context.fillText(model.quality, contentX, y);
  }
  y += 54;
  context.strokeStyle = "#e2e8f1";
  context.beginPath();
  context.moveTo(contentX, y);
  context.lineTo(contentX + contentWidth, y);
  context.stroke();
  y += 42;
  context.fillStyle = "#52647f";
  context.font = `20px ${FONT_FAMILY}`;
  context.fillText(model.time, contentX, y);
  y += 38;
  context.fillStyle = "#294c82";
  context.font = `700 21px ${FONT_FAMILY}`;
  context.fillText(model.source, contentX, y);
  y += 36;
  context.fillStyle = "#96a2b4";
  context.font = `18px ${FONT_FAMILY}`;
  context.fillText(model.disclaimer, contentX, y);
  y += 36;
  context.fillStyle = "#397ff6";
  context.font = `18px ${FONT_FAMILY}`;
  context.fillText(model.detailUrl, contentX, y);

  const fileName = safeFileName(`LZ-4Stage-${marketTitle}-阶段解读-${interpretation.commonStageAsOf}.png`);
  return downloadCanvas(canvas, fileName);
}
