import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("trend radar is a protected snapshot page with three scan conditions", () => {
  assert.match(apiSource, /viewKey: "trendRadar"/);
  assert.match(apiSource, /\.eq\("view_key", "trendRadar"\)/);
  assert.match(pageSource, /type ProtectedPage = MemberView \| "trendRadar"/);
  assert.match(pageSource, /if \(!isMember\) \{[\s\S]*setPendingView\("trendRadar"\)/);
  assert.match(pageSource, /aria-label="会员工具"/);
  assert.match(pageSource, /手机端会员工具/);
  assert.match(pageSource, /趋势雷达/);
  assert.match(pageSource, /转向S2观察/);
  assert.match(pageSource, /S4B- \/ S4- \/ S4B \/ S3 · 本周观察转向S2/);
  assert.match(pageSource, /当前进入S2A阶段/);
  assert.match(pageSource, /S2持续时间不超过4周/);
  assert.match(pageSource, /market\.matchRules\.map/);
  assert.match(pageSource, /<dt>确认时间<\/dt><dd>\{market\.weeks\}周 · \{stageConfirmationDateFor\(market\)\} 4AM UTC\+8<\/dd>/);
  assert.doesNotMatch(pageSource, /radar-detail-button|查看阶段详情/);
  assert.match(pageSource, /扫描 \{snapshot\.universeSize\} 个全球精选资产/);
  assert.match(cssSource, /\.radar-summary \{ display: grid;/);
  assert.match(cssSource, /\.radar-results \{ display: grid;/);
  assert.match(cssSource, /@media \(max-width: 480px\)[\s\S]*\.radar-summary, \.radar-results \{ grid-template-columns: 1fr;/);
});
