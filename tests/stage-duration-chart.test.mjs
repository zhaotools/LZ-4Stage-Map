import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
test("stage history is member-only, crypto-page-only, and independent of market filters", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /view === "crypto7" && isMember && <StageDurationChart assets=\{activeUniverse\}/);
  assert.match(page, /stageDurations\?: StageDurationHistory \| null/);
});
test("duration chart uses proportional weeks, separates equities and labels incomplete/current history", async () => {
  const source = await readFile(new URL("../app/components/stage-duration-chart.tsx", import.meta.url), "utf8");
  assert.match(source, /segment.weeks \/ scale \* 592/);
  assert.match(source, /current.weeks === asset.weeks/);
  for (const label of ["加密资产","加密相关股票","历史待同步","起点不完整","进行中","累计周数","不预测剩余时间"]) assert.ok(source.includes(label));
  assert.match(source, /asset.cryptoFreshness !== "unavailable"/);
  assert.match(source, /history.asOf === asset.stageAsOf/);
  assert.match(source, /role="img" aria-label=/);
});
