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
  assert.match(pageSource, />个股扫描<\/span>/);
  assert.match(pageSource, /<span>本周匹配<\/span><strong>\{markets\.length\}<\/strong><small>只不重复股票<\/small>/);
  assert.match(pageSource, /A股·港股·美股高流动性股票四阶段状态/);
  assert.match(pageSource, /\{stat\.matches\} 只匹配股票/);
  assert.match(pageSource, /显示 \{filtered\.length\} \/ \{markets\.length\} 只匹配股票/);
  assert.doesNotMatch(pageSource, /观察标的/);
  assert.doesNotMatch(pageSource, /个机会/);
  assert.match(pageSource, /20日均额/);
  assert.match(pageSource, /className="radar-result-card stock-radar-result"[\s\S]*href=\{tradingViewChartUrlFor\(market\)\}[\s\S]*target="_blank"/);
  assert.match(pageSource, /className="radar-result-card stock-radar-result"[\s\S]*?<dt>当前阶段<\/dt>[\s\S]*?<dt>主阶段持续<\/dt>[\s\S]*?<dt>本阶段起始时间<\/dt>[\s\S]*?<dt>本周观察<\/dt>[\s\S]*?<dt>30周均线：<\/dt><dd style=\{\{ color: maColor \}\}>\{maDirection\} · 近5周 \{market\.momentum\.toFixed\(2\)\}%<\/dd>/);
  assert.match(pageSource, /<dt>主阶段持续<\/dt><dd>\{market\.weeks\}周<\/dd><\/div>\s*<div><dt>本阶段起始时间<\/dt><dd>\{stageConfirmationTimeFor\(market\)\}<\/dd>/);
  assert.match(pageSource, /stockRadarSnapshot\.matches/);
  assert.match(pageSource, /pendingView === "stockRadar"/);
  assert.match(pageSource, /登录会员账号后查看300只高流动性股票扫描结果/);
  assert.match(cssSource, /\.stock-market-health/);
  assert.match(cssSource, /\.stock-radar-status/);
  assert.match(pageSource, /本次获取 \{snapshot\.quality\.live\} 只 · 使用缓存 \{snapshot\.quality\.cache\} 只/);
  assert.match(pageSource, /扫描完成率 \{snapshot\.quality\.completionRate\}%/);
  assert.doesNotMatch(pageSource, /\{snapshot\.quality\.completionRate\}% 完整/);
  assert.doesNotMatch(pageSource, /\{snapshot\.quality\.live\} 实时/);
  assert.match(cssSource, /background: color-mix\(in srgb, var\(--radar-stage-color\) 4%, #fff\)/);
  assert.match(cssSource, /\.radar-result-card:hover, \.radar-result-card:focus-visible/);
});
