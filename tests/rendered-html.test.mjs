import assert from "node:assert/strict";
import test from "node:test";

test("renders the real-data trend map", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /全球指数趋势地图/);
  assert.match(html, /点击获取完整LZ-4Stage/);
  assert.match(html, /全球主要市场趋势看版(?:<!-- -->)? · Power by LZ-4Stage/);
  assert.match(html, /全球市场阶段地图/);
  assert.match(html, /阶段分布/);
  assert.match(html, /<span>全球指数<\/span>/);
  assert.match(html, /<span>加密市场<\/span>/);
  assert.match(html, /<span>美股指数<\/span>/);
  assert.match(html, /<span>港股指数<\/span>/);
  assert.match(html, /<span>A股指数<\/span>/);
  assert.match(html, /16(?:<!-- -->)? 个资产/);
  assert.match(html, /真实完整周线分析/);
  assert.match(html, /标普500指数/);
  assert.doesNotMatch(html, /mock|示例数据/i);
  assert.doesNotMatch(html, /趋势温度|上升阶段占优/);
  assert.doesNotMatch(html, /指数阶段明细|<span>趋势总览<\/span>|<span>指数明细<\/span>/);
  assert.doesNotMatch(html, /class="(?:stage-card|map-legend|stage-filter)/);
  assert.ok(html.indexOf("共同确认至") < html.indexOf("市场筛选"));
  assert.ok(html.indexOf('class="region-tabs"') < html.indexOf('class="stage-distribution"'));
  assert.ok(html.indexOf('class="stage-distribution"') < html.indexOf('class="map-panel"'));
});
