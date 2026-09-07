import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { refreshWindow, newerSnapshot, validateSnapshot, startWeeklyRefresh } from "../app/lib/weekly-refresh.mjs";

const time = (value) => Date.parse(value);
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("checkpoints are Saturday and Monday 14:00 Beijing, independent of local timezone", () => {
  for (const [now, due, next] of [
    ["2026-09-05T13:59:59+08:00", "2026-08-31T14:00:00+08:00", "2026-09-05T14:00:00+08:00"],
    ["2026-09-05T14:00:00+08:00", "2026-09-05T14:00:00+08:00", "2026-09-07T14:00:00+08:00"],
    ["2026-09-07T14:00:00+08:00", "2026-09-07T14:00:00+08:00", "2026-09-12T14:00:00+08:00"],
    ["2027-01-01T14:00:00+08:00", "2026-12-28T14:00:00+08:00", "2027-01-02T14:00:00+08:00"],
  ]) assert.deepEqual(refreshWindow(time(now)), { due: time(due), next: time(next) });
});

test("only newer valid versions replace cached data; each snapshot is independent", () => {
  const old = { generatedAt: "2026-09-05T06:00:00Z", markets: [] };
  const fresh = { ...old, generatedAt: "2026-09-07T06:00:00Z" };
  assert.equal(newerSnapshot(old, fresh), fresh);
  assert.equal(newerSnapshot(fresh, old), fresh);
  assert.equal(newerSnapshot(fresh, { ...fresh }), fresh);
  assert.equal(newerSnapshot(null, fresh), fresh);
  assert.equal(validateSnapshot(fresh, "markets"), fresh);
  assert.throws(() => validateSnapshot({ generatedAt: "bad", markets: [] }, "markets"));
  assert.throws(() => validateSnapshot(fresh, "matches"));
});

function harness(refresh) {
  let now = time("2026-09-05T13:00:00+08:00");
  let visible = true;
  let online = true;
  let pending;
  const controller = startWeeklyRefresh(refresh, {
    now: () => now, visible: () => visible, online: () => online,
    schedule(fn, delay) { pending = { fn, delay }; return 1; },
    cancel() { pending = null; },
  });
  return { controller, setTime: (value) => { now = time(value); },
    visible: (value) => { visible = value; }, online: (value) => { online = value; },
    timer: () => pending };
}

test("checks on open and at checkpoint, not on every foreground event", async () => {
  let calls = 0;
  const h = harness(async () => { calls++; });
  await settle();
  assert.equal(calls, 1);
  assert.equal(h.timer().delay, 3600000);
  await h.controller.check();
  assert.equal(calls, 1);
  h.setTime("2026-09-05T14:00:00+08:00");
  await h.timer().fn();
  assert.equal(calls, 2);
  assert.equal(h.timer().delay, 2 * 86400000);
  h.controller.stop();
  assert.equal(h.timer(), null);
});

test("missed background/offline checkpoints catch up on return, once", async () => {
  let calls = 0;
  const h = harness(async () => { calls++; });
  await settle();
  h.visible(false);
  h.setTime("2026-09-05T14:00:00+08:00");
  await h.timer().fn();
  assert.equal(calls, 1);
  h.visible(true);
  h.online(false);
  await h.controller.check();
  assert.equal(calls, 1);
  h.online(true);
  await h.controller.check();
  await h.controller.check();
  assert.equal(calls, 2);
  h.controller.stop();
});

test("failed or partial requests retry only on a later event; in-flight calls are deduplicated", async () => {
  let calls = 0;
  let release;
  const h = harness(() => { calls++; return new Promise((resolve) => { release = resolve; }); });
  await h.controller.check();
  assert.equal(calls, 1);
  release(false);
  await settle();
  const retry = h.controller.check();
  assert.equal(calls, 2);
  release(true);
  await retry;
  await h.controller.check();
  assert.equal(calls, 2);
  h.controller.stop();
});

test("page refreshes public and loaded protected snapshots without reload or interval polling", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /BASE_URL\}data\/dashboard\.json/);
  assert.match(source, /cache: "no-store"/);
  assert.match(source, /if \(isMember\)/);
  assert.match(source, /Promise\.allSettled\(jobs\)/);
  for (const event of ["visibilitychange", "pageshow", "online"]) {
    assert.ok(source.includes(`addEventListener("${event}"`));
    assert.ok(source.includes(`removeEventListener("${event}"`));
  }
  assert.doesNotMatch(source, /location\.reload|setInterval/);
});

test("a request crossing a checkpoint does not consume the new checkpoint", async () => {
  let calls = 0;
  let release;
  const h = harness(() => { calls++; return new Promise((resolve) => { release = resolve; }); });
  h.setTime("2026-09-05T14:00:00+08:00");
  await h.timer().fn();
  assert.equal(calls, 1);
  release(true);
  await settle();
  assert.equal(calls, 2);
  h.controller.stop();
  release(true);
  await settle();
  await h.controller.check();
  assert.equal(calls, 2);
  assert.equal(h.timer(), null);
});
