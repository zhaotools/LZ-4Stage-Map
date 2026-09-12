import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../app/components/my-scan-page.tsx", import.meta.url), "utf8");
const api = await readFile(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("My Scan is a member-only desktop and mobile page", () => {
  assert.match(page, /type ProtectedPage = MemberView \| "trendRadar" \| "stockRadar" \| "myScan"/);
  assert.match(page, /const requestMyScan = async \(\) => \{[\s\S]*setPendingView\("myScan"\)[\s\S]*loadMyScan\(true\)/);
  assert.match(page, /onClick=\{requestMyScan\}.*我的扫描/);
  assert.match(page, /requestMyScan\(\); \}\}><MousePointerClick.*<span>我的扫描<\/span>/);
  assert.match(page, /const switchToMyScan = \(\) => \{[\s\S]*setMyScanActive\(true\);[\s\S]*scrollPageToTop\(\)/);
  assert.match(page, /<MyScanPage/);
});

test("My Scan UI supports exact lookup, four markets, 20 assets and retained results", () => {
  for (const region of ["美股", "A股", "港股", "加密"]) assert.match(component, new RegExp(region));
  assert.match(component, /只查询精确代码/);
  assert.match(component, /\{assets\.length\}<\/strong><span>\/ 20/);
  assert.match(component, /已达20个上限/);
  assert.match(component, /等待周度首次计算/);
  assert.match(component, /本次更新失败，保留上期结果/);
  assert.match(component, /window\.open\(tradingViewChartUrlFor\(result\), "_blank", "noopener,noreferrer"\)/);
  assert.match(component, /role=\{result \? "link" : undefined\}/);
  assert.match(component, /className=\{`my-scan-card \$\{result \? `stage-\$\{result\.stage\.toLowerCase\(\)\} clickable` : "pending"\}`\}/);
  assert.match(component, /<dt>当前阶段<\/dt>[\s\S]*<dt>确认时间<\/dt>[\s\S]*<dt>本周观察<\/dt>[\s\S]*<dt>MA30趋势<\/dt>/);
  assert.match(component, /stageConfirmationTimeFor\(result\)/);
  assert.match(component, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(component, /my-scan-stage-result|my-scan-stage-code|行情确认至/);
  assert.doesNotMatch(component, /RefreshCw/);
  assert.match(component, /const analyzedTotal = assets\.reduce/);
  assert.match(component, /我的扫描四阶段占比分布/);
  assert.match(component, /\{stage\} \{stageSeasons\[stage\]\}/);
  assert.match(component, /Math\.round\(\(stageCounts\[stage\] \/ analyzedTotal\) \* 100\)/);
  assert.match(css, /\.my-scan-grid \{[^}]*grid-template-columns: repeat\(3,/);
  assert.match(css, /\.my-scan-stage-distribution \{[^}]*width: 100%;[^}]*min-width: 0;/);
  assert.match(css, /\.my-scan-card\.clickable:hover, \.my-scan-card\.clickable:focus-visible/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*\.my-scan-grid \{ grid-template-columns: 1fr; \}/);
});

test("My Scan API never exposes direct table writes or provider requests in the browser", () => {
  assert.match(api, /functions\.invoke\("lookup-watchlist-asset"/);
  assert.match(api, /rpc\("add_my_scan_asset"/);
  assert.match(api, /rpc\("remove_my_scan_asset"/);
  assert.match(api, /rpc\("get_my_scan_assets"/);
  assert.doesNotMatch(component, /yahoo|eastmoney|binance|okx|bybit/i);
  assert.doesNotMatch(api, /service_role|SUPABASE_SECRET/);
});
