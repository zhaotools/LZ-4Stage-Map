import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const memberApiSource = await readFile(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");

test("global market data is loaded only through the protected member API", async () => {
  await assert.rejects(access(new URL("../data/dashboard.json", import.meta.url)));
  await assert.rejects(access(new URL("../public/data/dashboard.json", import.meta.url)));
  assert.doesNotMatch(pageSource, /dashboard\.json|@\/data\/dashboard/);
  assert.match(pageSource, /getMemberSnapshot<DashboardMarket>\("global"/);
  assert.match(memberApiSource, /from\("market_snapshots"\)/);
  assert.match(memberApiSource, /export type MarketView = "global" \| MemberView/);
});
