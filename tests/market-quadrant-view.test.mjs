import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const chartSource = readFileSync(new URL("../app/components/market-quadrant-chart.tsx", import.meta.url), "utf8");
const imageSource = readFileSync(new URL("../app/lib/market-quadrant-image.mjs", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("market pages switch between the trend map and the responsive quadrant chart", () => {
  assert.match(pageSource, /useState<MapDisplay>\("trend"\)/);
  assert.match(pageSource, /aria-label="图表视图切换"/);
  assert.match(pageSource, />趋势图<\/button>/);
  assert.match(pageSource, />象限图<\/button>/);
  assert.match(pageSource, /mapDisplay === "trend"[\s\S]*?<GlobalStageMap[\s\S]*?<MarketQuadrantChart/);
  assert.match(pageSource, /markets=\{regionData\} view=\{view\}/);
  assert.match(pageSource, /横轴显示主阶段持续时间；纵轴显示当前阶段/);
});

test("web quadrant reuses the export model, collision layout and active stage filter", () => {
  assert.match(chartSource, /buildMarketQuadrantModel\(markets, view, marketTitle, confirmationLabel\)/);
  assert.match(chartSource, /layoutMarketQuadrantLabels\(pointsWithPixels, plot/);
  assert.match(chartSource, /stageFilter === "全部" \|\| point\.stage === stageFilter/);
  assert.match(chartSource, /主阶段持续时间（周）/);
  assert.match(chartSource, /阶段分析仅供市场观察，不构成任何投资建议/);
  assert.match(cssSource, /\.market-quadrant-svg \{[^}]*min-width: 920px/);
  assert.match(cssSource, /\.market-quadrant-scroll \{[^}]*overflow-x: auto/);
});

test("web and downloaded quadrant charts omit dark axis lines", () => {
  assert.doesNotMatch(chartSource, /tick === 0 \? "#203a60"/);
  assert.doesNotMatch(chartSource, /<path d=\{`M \$\{plot\.x\} \$\{plot\.y\} V/);
  assert.doesNotMatch(imageSource, /context\.moveTo\(plot\.x, plot\.y\);\s*context\.lineTo\(plot\.x, plot\.y \+ plot\.height\)/);
});

test("web labels use real browser text measurements and allow wider boxes", () => {
  assert.match(chartSource, /textMeasurementContext\.measureText\(text\)\.width/);
  assert.match(imageSource, /Math\.min\(300, Math\.max\(124, measureText\(point\.label\)\.width \+ 26\)\)/);
});

test("all stage names and descriptions share the same centered axis position", () => {
  assert.match(chartSource, /x=\{plot\.x - 58\}[\s\S]*?textAnchor="middle">\{stage\.stage\}/);
  assert.match(chartSource, /x=\{plot\.x - 58\}[\s\S]*?textAnchor="middle">（\{stage\.axisLabel\}）/);
  assert.match(imageSource, /context\.textAlign = "center";\s*context\.fillText\(stage\.stage, plot\.x - 58/);
  assert.match(imageSource, /context\.fillText\(`（\$\{stage\.axisLabel\}）`, plot\.x - 58/);
});
