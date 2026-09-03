import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("member-only stock radar loads the protected 300-stock S2 snapshot", () => {
  assert.match(apiSource, /viewKey: "stockRadar"/);
  assert.match(apiSource, /\.eq\("view_key", "stockRadar"\)/);
  assert.match(pageSource, /type ProtectedPage = MemberView \| "trendRadar" \| "stockRadar"/);
  assert.match(pageSource, /onClick=\{requestStockRadar\}/);
  assert.match(pageSource, />个股阶段扫描<\/span>/);
  assert.match(pageSource, /A股·港股·美股高流动性股票四阶段状态/);
  assert.match(pageSource, /20日均额/);
  assert.match(pageSource, /stockRadarSnapshot\.matches/);
  assert.match(pageSource, /pendingView === "stockRadar"/);
  assert.match(pageSource, /登录会员账号后查看300只高流动性股票扫描结果/);
  assert.match(cssSource, /\.stock-market-health/);
  assert.match(cssSource, /\.stock-radar-status/);
});
