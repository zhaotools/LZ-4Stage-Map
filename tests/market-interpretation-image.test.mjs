import assert from "node:assert/strict";
import test from "node:test";

import { buildInterpretationImageModel, downloadMarketInterpretationImage } from "../app/lib/market-interpretation-image.mjs";

const interpretation = {
  generatedAt: "2026-09-09T15:06:53.110Z",
  commonStageAsOf: "2026-09-07",
  stageCounts: { S1: 1, S2: 9, S3: 1, S4: 5 },
  headline: "全球市场以S2上升阶段为主",
  summary: "S2资产占9/16，上升结构占比较高。",
  insights: [
    { id: "structure", label: "阶段结构", text: "16个有效资产中，S1 1个、S2 9个、S3 1个、S4 5个。" },
    { id: "observation", label: "本周观察", text: "观察信号尚未等同于阶段确认。" },
  ],
  excludedSize: 0,
  note: "阶段数量用于描述当前周期位置，不构成投资建议。",
};

test("image export model includes the selected market, data provenance and all interpretation content", () => {
  const model = buildInterpretationImageModel(interpretation, "全球市场", new Date("2026-09-10T00:30:00+08:00"));

  assert.equal(model.title, "全球市场阶段解读");
  assert.equal(model.headline, interpretation.headline);
  assert.deepEqual(model.stageCounts.map(({ label, count }) => [label, count]), [["S1 春季", 1], ["S2 夏季", 9], ["S3 秋季", 1], ["S4 冬季", 5]]);
  assert.equal(model.insights.length, 2);
  assert.equal(model.source, "数据来自公开市场，由 LZ-4Stage 框架系统分析。");
  assert.equal(model.time, "数据确认至 2026-09-07 · 图片生成于 2026/09/10");
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
    const fileName = await downloadMarketInterpretationImage(interpretation, "全球市场");
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
