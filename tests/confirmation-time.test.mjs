import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmationDateFor,
  confirmationTimeForTradingDate,
  latestConfirmationDate,
  stageConfirmationTimeFor,
} from "../app/lib/confirmation-time.mjs";

const market = (region, exchange, overrides = {}) => ({ region, exchange, stageAsOf: "2026-08-28", weeks: 1, ...overrides });

test("converts each market weekly close to Beijing time", () => {
  assert.equal(confirmationTimeForTradingDate(market("美股", "NYSE")), "2026-08-29 04:00 UTC+8");
  assert.equal(confirmationTimeForTradingDate(market("美股", "NYSE", { stageAsOf: "2026-12-18" })), "2026-12-19 05:00 UTC+8");
  assert.equal(confirmationTimeForTradingDate(market("A股", "SSE")), "2026-08-28 15:00 UTC+8");
  assert.equal(confirmationTimeForTradingDate(market("港股", "HKEX")), "2026-08-28 16:00 UTC+8");
  assert.equal(confirmationTimeForTradingDate(market("日股", "OSE")), "2026-08-28 14:30 UTC+8");
  assert.equal(confirmationTimeForTradingDate(market("欧股", "STOXX")), "2026-08-28 23:30 UTC+8");
  assert.equal(confirmationTimeForTradingDate(market("欧股", "STOXX", { stageAsOf: "2026-12-18" })), "2026-12-19 00:30 UTC+8");
  assert.equal(confirmationTimeForTradingDate(market("大宗·宏观", "COMEX")), "2026-08-29 05:00 UTC+8");
  assert.equal(confirmationTimeForTradingDate(market("加密", "CRYPTO", { stageAsOf: "2026-08-24" })), "2026-08-31 08:00 UTC+8");
});

test("uses Beijing dates for stage start and page confirmation", () => {
  const us = market("美股", "NYSE", { weeks: 19 });
  const china = market("A股", "SSE");
  const crypto = market("加密", "CRYPTO", { stageAsOf: "2026-08-24" });
  assert.equal(stageConfirmationTimeFor(us), "2026-04-25 04:00 UTC+8");
  assert.equal(confirmationDateFor(us), "2026-08-29");
  assert.equal(latestConfirmationDate([china, us, crypto], { excludeCrypto: true }), "2026-08-29");
  assert.equal(latestConfirmationDate([china, us, crypto]), "2026-08-31");
});
