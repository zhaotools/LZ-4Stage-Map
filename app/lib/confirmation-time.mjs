const BEIJING_TIME_ZONE = "Asia/Shanghai";

function addUtcDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const renderedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return (renderedAsUtc - date.getTime()) / 60000;
}

function zonedDateTimeToUtc(dateText, timeText, timeZone) {
  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let offset = timeZoneOffsetMinutes(new Date(wallClockAsUtc), timeZone);
  let instant = new Date(wallClockAsUtc - offset * 60000);
  const correctedOffset = timeZoneOffsetMinutes(instant, timeZone);
  if (correctedOffset !== offset) instant = new Date(wallClockAsUtc - correctedOffset * 60000);
  return instant;
}

function formatBeijingDateTime(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BEIJING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function marketCloseSpec(market) {
  if (market.region === "A股") return { timeZone: "Asia/Shanghai", time: "15:00" };
  if (market.region === "港股") return { timeZone: "Asia/Hong_Kong", time: "16:00" };
  if (market.region === "日股") return { timeZone: "Asia/Tokyo", time: "15:30" };
  if (market.region === "欧股") return { timeZone: "Europe/Berlin", time: "17:30" };
  if (market.region === "大宗·宏观" && ["ICE", "NYMEX", "COMEX"].includes(market.exchange)) {
    return { timeZone: "America/New_York", time: "17:00" };
  }
  return { timeZone: "America/New_York", time: "16:00" };
}

export function confirmationTimeForTradingDate(market, tradingDate = market.stageAsOf) {
  if (market.region === "加密" || market.exchange === "CRYPTO") {
    const confirmedAt = new Date(`${addUtcDays(tradingDate, 7)}T00:00:00Z`);
    return `${formatBeijingDateTime(confirmedAt)} UTC+8`;
  }
  const spec = marketCloseSpec(market);
  return `${formatBeijingDateTime(zonedDateTimeToUtc(tradingDate, spec.time, spec.timeZone))} UTC+8`;
}

export function confirmationDateFor(market) {
  return confirmationTimeForTradingDate(market).slice(0, 10);
}

export function stageConfirmationTimeFor(market) {
  const stageStartTradingDate = addUtcDays(market.stageAsOf, -(market.weeks - 1) * 7);
  return confirmationTimeForTradingDate(market, stageStartTradingDate);
}

export function latestConfirmationDate(markets, { excludeCrypto = false } = {}) {
  const eligible = excludeCrypto ? markets.filter((market) => market.region !== "加密") : markets;
  return eligible.map(confirmationDateFor).sort().at(-1) ?? null;
}
