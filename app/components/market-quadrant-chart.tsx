"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { buildMarketQuadrantModel, downloadMarketQuadrantImage, layoutMarketQuadrantLabels } from "@/app/lib/market-quadrant-image.mjs";

type Stage = "S1" | "S2" | "S3" | "S4";

type QuadrantMarket = {
  code: string;
  shortCode: string;
  name: string;
  region: string;
  stage: Stage;
  subStage: string;
  weeks: number;
  stageAsOf: string;
  cryptoFreshness?: "fresh" | "pending" | "unavailable";
};

type QuadrantPoint = {
  code: string;
  label: string;
  stage: Stage;
  stageValue: number;
  yValue: number;
  weeks: number;
  color: string;
  pixelX: number;
  pixelY: number;
  labelBox: { x: number; y: number; width: number; height: number };
};

const chartWidth = 1600;
const chartHeight = 920;
const plot = { x: 154, y: 50, width: 1376, height: 760, bandHeight: 190 };
let textMeasurementContext: CanvasRenderingContext2D | null | undefined;

function chartTextWidth(text: string) {
  if (typeof document !== "undefined") {
    if (textMeasurementContext === undefined) {
      const canvas = document.createElement("canvas");
      textMeasurementContext = canvas.getContext("2d");
      if (textMeasurementContext) textMeasurementContext.font = '700 18px "MiSans", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
    }
    if (textMeasurementContext) return textMeasurementContext.measureText(text).width;
  }
  return Array.from(text).reduce((width, character) => width + (/^[\x20-\x7E]$/u.test(character) ? 11.5 : 18), 0);
}

export function MarketQuadrantChart({ markets, view, marketTitle, confirmationLabel, stageFilter }: {
  markets: QuadrantMarket[];
  view: string;
  marketTitle: string;
  confirmationLabel: string;
  stageFilter: Stage | "全部";
}) {
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const model = buildMarketQuadrantModel(markets, view, marketTitle, confirmationLabel);
  const noun = view === "crossMarket" ? "比率" : "资产";
  if (!model.points.length) return <div className="market-quadrant-empty">当前没有可用于象限图的阶段数据</div>;

  const handleDownload = async () => {
    setDownloadStatus("generating");
    try {
      await downloadMarketQuadrantImage(markets, view, marketTitle, confirmationLabel);
      setDownloadStatus("done");
      window.setTimeout(() => setDownloadStatus("idle"), 1800);
    } catch {
      setDownloadStatus("error");
    }
  };
  const downloadLabel = downloadStatus === "generating"
    ? "正在生成象限图"
    : downloadStatus === "done"
      ? "象限图已下载"
      : downloadStatus === "error"
        ? "下载失败，点击重试"
        : `下载${model.title}`;

  const pointsWithPixels = model.points.map((point: Omit<QuadrantPoint, "pixelX" | "pixelY" | "labelBox">) => ({
    ...point,
    pixelX: plot.x + point.weeks / model.xAxis.max * plot.width,
    pixelY: plot.y + (4.5 - point.yValue) / 4 * plot.height,
  })).sort((left: QuadrantPoint, right: QuadrantPoint) => right.stageValue - left.stageValue || left.weeks - right.weeks);
  const points = layoutMarketQuadrantLabels(pointsWithPixels, plot, (label: string) => ({ width: chartTextWidth(label) })) as QuadrantPoint[];

  return (
    <div className="market-quadrant-chart">
      <div className="market-quadrant-head">
        <h3>{model.title}</h3>
        <p className="market-quadrant-subtitle">{model.subtitle}</p>
        <button className="market-quadrant-download" type="button" onClick={handleDownload} disabled={downloadStatus === "generating"} aria-label={downloadLabel} title={downloadLabel}>
          <Download size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="market-quadrant-scroll">
        <svg className="market-quadrant-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-labelledby="market-quadrant-title market-quadrant-description">
          <title id="market-quadrant-title">{model.title}</title>
          <desc id="market-quadrant-description">横轴为主阶段持续时间，纵轴为当前阶段；每个{noun}用带标签的圆点表示。</desc>
          {model.stages.map((stage, index: number) => {
            const bandY = plot.y + index * plot.bandHeight;
            return <g key={stage.stage}>
              <rect x={plot.x} y={bandY} width={plot.width} height={plot.bandHeight} fill={stage.background} />
              <text x={plot.x - 58} y={bandY + plot.bandHeight / 2 - 7} fill={stage.color} fontSize="34" fontWeight="800" textAnchor="middle">{stage.stage}</text>
              <text x={plot.x - 58} y={bandY + plot.bandHeight / 2 + 26} fill="#5c6f89" fontSize="17" fontWeight="600" textAnchor="middle">（{stage.axisLabel}）</text>
            </g>;
          })}
          {model.xAxis.ticks.map((tick: number) => {
            const x = plot.x + tick / model.xAxis.max * plot.width;
            return <g key={tick}>
              <line x1={x} y1={plot.y} x2={x} y2={plot.y + plot.height} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6 6" />
              <text x={x} y={plot.y + plot.height + 34} fill="#263b59" fontSize="18" fontWeight="600" textAnchor="middle">{tick}</text>
            </g>;
          })}
          {[1, 2, 3, 4].map((stage) => {
            const y = plot.y + (4.5 - stage) / 4 * plot.height;
            return <line key={stage} x1={plot.x} y1={y} x2={plot.x + plot.width} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6 6" />;
          })}
          <text x={plot.x + plot.width / 2} y={plot.y + plot.height + 78} fill="#263b59" fontSize="22" fontWeight="700" textAnchor="middle">主阶段持续时间（周）</text>
          <text x="38" y={plot.y + plot.height / 2} fill="#263b59" fontSize="22" fontWeight="700" textAnchor="middle" transform={`rotate(-90 38 ${plot.y + plot.height / 2})`}>当前阶段</text>

          {points.map((point) => {
            const opacity = stageFilter === "全部" || point.stage === stageFilter ? 1 : 0.14;
            const anchorX = Math.min(point.labelBox.x + point.labelBox.width, Math.max(point.labelBox.x, point.pixelX));
            const anchorY = Math.min(point.labelBox.y + point.labelBox.height, Math.max(point.labelBox.y, point.pixelY));
            return <line key={`connector-${point.code}`} x1={point.pixelX} y1={point.pixelY} x2={anchorX} y2={anchorY} stroke={point.color} strokeWidth="2" opacity={opacity} />;
          })}
          {points.map((point) => {
            const opacity = stageFilter === "全部" || point.stage === stageFilter ? 1 : 0.14;
            return <g key={`label-${point.code}`} opacity={opacity}>
              <rect x={point.labelBox.x} y={point.labelBox.y} width={point.labelBox.width} height={point.labelBox.height} rx="9" fill="#fffffff0" stroke={point.color} strokeWidth="2" />
              <text x={point.labelBox.x + 13} y={point.labelBox.y + 26} fill="#1c2e49" fontSize="18" fontWeight="700">{point.label}</text>
            </g>;
          })}
          {points.map((point) => {
            const opacity = stageFilter === "全部" || point.stage === stageFilter ? 1 : 0.14;
            return <circle key={`point-${point.code}`} cx={point.pixelX} cy={point.pixelY} r="12" fill={point.color} stroke="#fff" strokeWidth="4" opacity={opacity}><title>{point.label}</title></circle>;
          })}
        </svg>
      </div>
      <div className="market-quadrant-legend" aria-label={`${noun}分类图例`}>
        {model.groups.map((group: { id: string; label: string; color: string; count: number }) => <span key={group.id}><i style={{ background: group.color }} />{group.label}（{group.count}个）</span>)}
      </div>
      <div className="market-quadrant-meta"><span>{confirmationLabel}</span><span>阶段分析仅供市场观察，不构成任何投资建议</span></div>
    </div>
  );
}
