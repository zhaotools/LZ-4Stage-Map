import assert from "node:assert/strict";
import test from "node:test";

import { buildInterpretationImageModel, downloadMarketInterpretationImage } from "../app/lib/market-interpretation-image.mjs";

const interpretation = {
  schemaVersion: "lz-market-interpretation-v2",
  generatedAt: "2026-09-09T15:06:53.110Z",
  commonStageAsOf: "2026-08-31",
  analyzedSize: 16,
  stageCounts: { S1: 1, S2: 9, S3: 1, S4: 5 },
  stageDistribution: [
    { stage: "S1", season: "春季", count: 1, percent: 6, delta: 0 },
    { stage: "S2", season: "夏季", count: 9, percent: 56, delta: 1 },
    { stage: "S3", season: "秋季", count: 1, percent: 6, delta: 0 },
    { stage: "S4", season: "冬季", count: 5, percent: 31, delta: -1 },
  ],
  headline: "S2 夏季占优，但市场分化明显",
  summary: "16个代表资产中，9个处于S2（56%）；5个处于S4（31%）。",
  marketStructure: [{ label: "美股", summary: "S2为主", stageCounts: { S1: 0, S2: 3, S3: 0, S4: 1 } }],
  keyPositions: [{ id: "s2Early", label: "S2早期", stage: "S2", assets: [{ code: "BTC", name: "比特币", subStage: "S2A", weeks: 1 }] }],
  confirmedChanges: [{ code: "BTC", name: "比特币", fromStage: "S4", toStage: "S2" }],
  observations: [{ code: "HSI", name: "恒生指数", fromStage: "S4", toStage: "S1", status: "continuing", progress: null }],
  insights: [],
  excludedSize: 0,
  note: "阶段数量用于描述当前周期位置，不构成投资建议。",
};

test("image export model shares the page V2 structure, positions, changes and confirmation dates", () => {
  const model = buildInterpretationImageModel(interpretation, "全球市场", "传统市场至 2026-09-05｜加密市场至 2026-09-07");

  assert.equal(model.title, "全球市场阶段解读");
  assert.equal(model.headline, interpretation.headline);
  assert.deepEqual(model.stageCounts.map(({ label, count, percent }) => [label, count, percent]), [["S1 春季", 1, 6], ["S2 夏季", 9, 56], ["S3 秋季", 1, 6], ["S4 冬季", 5, 31]]);
  assert.equal(model.marketStructure[0].summary, "S2为主");
  assert.equal(model.keyPositions[0].assets[0].name, "比特币");
  assert.match(model.changeLines.join("\n"), /阶段净变化：S2 \+1｜S4 -1/);
  assert.match(model.changeLines.join("\n"), /比特币 S4 → S2/);
  assert.match(model.changeLines.join("\n"), /恒生指数 S4 → S1观察（延续）/);
  assert.equal(model.source, "数据来自公开市场，由 LZ-4Stage 框架系统分析。");
  assert.equal(model.confirmationLabel, "传统市场至 2026-09-05｜加密市场至 2026-09-07");
  assert.equal(model.fileDate, "2026-09-07");
  assert.equal(model.detailUrl, "阶段地图详情：https://zhaotools.github.io/LZ-4Stage-Map/");
});

test("image export paints a PNG and triggers a browser download", async () => {
  let clicked = false;
  let downloadedAs = "";
  let revoked = "";
  const context = {
    beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {}, fill() {}, stroke() {}, fillRect() {}, fillText() {}, arc() {},
    measureText(text) { return { width: Array.from(text).length * 24 }; },
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
  URL.createObjectURL = () => "blob:interpretation-image";
  URL.revokeObjectURL = (url) => { revoked = url; };

  try {
    const fileName = await downloadMarketInterpretationImage(interpretation, "全球市场", "传统市场至 2026-09-05｜加密市场至 2026-09-07");
    assert.equal(clicked, true);
    assert.equal(downloadedAs, fileName);
    assert.match(fileName, /^LZ-4Stage-全球市场-阶段解读-2026-09-07\.png$/);
    assert.equal(revoked, "blob:interpretation-image");
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  }
});
