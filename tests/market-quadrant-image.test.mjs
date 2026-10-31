import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMarketQuadrantModel,
  downloadMarketQuadrantImage,
  layoutMarketQuadrantLabels,
} from "../app/lib/market-quadrant-image.mjs";

const markets = [
  { code: "000300.SH", shortCode: "000300", name: "沪深300指数", region: "A股", stage: "S4", subStage: "S4", weeks: 6, stageAsOf: "2026-10-23" },
  { code: "000984.SH", shortCode: "000984", name: "沪深300等权", region: "A股", stage: "S4", subStage: "S4", weeks: 14, stageAsOf: "2026-10-23" },
  { code: "931865.CSI", shortCode: "半导体", name: "中证全指半导体", region: "A股", stage: "S2", subStage: "S2B", weeks: 64, stageAsOf: "2026-10-23" },
  { code: "930651.CSI", shortCode: "计算机", name: "中证计算机主题", region: "A股", stage: "S1", subStage: "S1", weeks: 8, stageAsOf: "2026-10-23" },
];

test("quadrant model maps duration to X, stages to Y and preserves page groups", () => {
  const model = buildMarketQuadrantModel(markets, "chinaIndices", "A股市场", "阶段数据截至：2026-10-23");

  assert.equal(model.title, "A股市场4个资产阶段象限图");
  assert.equal(model.subtitle, "X轴：主阶段持续时间（周）｜Y轴：当前阶段（S1–S4）");
  assert.equal(model.fileDate, "2026-10-23");
  assert.deepEqual(model.groups.map(({ label, count }) => [label, count]), [["市场", 2], ["行业", 2]]);
  assert.equal(model.points.find((point) => point.code === "931865.CSI")?.stageValue, 2);
  assert.equal(model.points.find((point) => point.code === "931865.CSI")?.weeks, 64);
  assert.match(model.points.find((point) => point.code === "931865.CSI")?.label || "", /S2B｜64周/);
  assert.equal(model.xAxis.max, 70);
  assert.deepEqual(model.xAxis.ticks, [0, 10, 20, 30, 40, 50, 60, 70]);
  assert.deepEqual(model.stages.map((stage) => stage.stage), ["S4", "S3", "S2", "S1"]);
  assert.deepEqual(model.stages.map((stage) => stage.axisLabel), ["下降期", "观察期", "发展期", "早期"]);
});

test("Nasdaq 100 uses its market name instead of the NDX short code", () => {
  const model = buildMarketQuadrantModel([
    { code: "GSPC.INDEX", shortCode: "SPX", name: "标普500指数", region: "美股", stage: "S2", subStage: "S2-", weeks: 27, stageAsOf: "2026-10-23" },
    { code: "NDQ", shortCode: "NDX", name: "纳斯达克100指数", region: "美股", stage: "S2", subStage: "S2-", weeks: 27, stageAsOf: "2026-10-23" },
  ], "global", "全球市场", "阶段数据截至：2026-10-23");

  assert.match(model.points.find((point) => point.code === "GSPC.INDEX")?.label || "", /^标普500指数｜/u);
  assert.match(model.points.find((point) => point.code === "NDQ")?.label || "", /^纳斯达克100指数｜/u);
  assert.doesNotMatch(model.points.find((point) => point.code === "NDQ")?.label || "", /^NDX｜/u);
});

test("dense assets in one stage receive non-overlapping labels", () => {
  const plot = { x: 154, y: 168, width: 1376, height: 760, bandHeight: 190 };
  const weeks = [1, 6, 8, 10, 10, 10, 14, 14, 14, 15, 15, 20, 34, 43];
  const points = weeks.map((week, index) => ({
    code: `dense-${index}`,
    label: `密集资产${index + 1}｜S4｜${week}周`,
    stageValue: 4,
    pixelX: plot.x + week / 70 * plot.width,
    pixelY: plot.y + 95 + ((index % 5) - 2) * 9,
  }));
  const laidOut = layoutMarketQuadrantLabels(points, plot, (text) => ({ width: Array.from(text).length * 18 }));

  for (let index = 0; index < laidOut.length; index += 1) {
    const box = laidOut[index].labelBox;
    assert.ok(box.x >= plot.x + 6);
    assert.ok(box.x + box.width <= plot.x + plot.width - 6);
    assert.ok(box.y >= plot.y + 6);
    assert.ok(box.y + box.height <= plot.y + plot.bandHeight - 6);
    for (let otherIndex = index + 1; otherIndex < laidOut.length; otherIndex += 1) {
      const other = laidOut[otherIndex].labelBox;
      const overlaps = box.x < other.x + other.width + 7
        && box.x + box.width + 7 > other.x
        && box.y < other.y + other.height + 7
        && box.y + box.height + 7 > other.y;
      assert.equal(overlaps, false, `${laidOut[index].code} overlaps ${laidOut[otherIndex].code}`);
    }
  }
});

test("quadrant export paints a 4:3 PNG and starts the browser download", async () => {
  let clicked = false;
  let downloadedAs = "";
  let revoked = "";
  const paintedText = [];
  const context = {
    beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {}, fill() {}, stroke() {}, fillRect() {}, arc() {},
    save() {}, restore() {}, translate() {}, rotate() {}, setLineDash() {},
    fillText(text) { paintedText.push(text); },
    measureText(text) { return { width: Array.from(text).length * 18 }; },
    createLinearGradient() { return { addColorStop() {} }; },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext() { return context; },
    toBlob(callback) { callback(new Blob(["png"], { type: "image/png" })); },
  };
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  globalThis.document = {
    fonts: { ready: Promise.resolve() },
    createElement(tag) {
      if (tag === "canvas") return canvas;
      return { href: "", rel: "", remove() {}, click() { clicked = true; downloadedAs = this.download; } };
    },
    body: { appendChild() {} },
  };
  globalThis.window = { setTimeout(callback) { callback(); } };
  URL.createObjectURL = () => "blob:quadrant-image";
  URL.revokeObjectURL = (url) => { revoked = url; };

  try {
    const fileName = await downloadMarketQuadrantImage(markets, "chinaIndices", "A股市场", "阶段数据截至：2026-10-23");
    assert.equal(clicked, true);
    assert.equal(downloadedAs, fileName);
    assert.equal(revoked, "blob:quadrant-image");
    assert.match(fileName, /^LZ-4Stage-Map-A股市场-阶段象限图-2026-10-23\.png$/u);
    assert.equal(canvas.width, 1600);
    assert.equal(canvas.height, 1200);
    assert.equal(canvas.width / canvas.height, 4 / 3);
    assert.ok(paintedText.includes("A股市场4个资产阶段象限图"));
    assert.ok(paintedText.includes("X轴：主阶段持续时间（周）｜Y轴：当前阶段（S1–S4）"));
    assert.ok(paintedText.includes("市场（2个）"));
    assert.ok(paintedText.includes("行业（2个）"));
    assert.ok(paintedText.includes("沪深300指数｜S4｜6周"));
    assert.ok(paintedText.includes("阶段数据截至：2026-10-23"));
    assert.ok(paintedText.includes("阶段分析仅供市场观察，不构成任何投资建议"));
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  }
});
