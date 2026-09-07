const DAY = 86400000;
const WEEK = 7 * DAY;

// Saturday / Monday 14:00 Beijing = 06:00 UTC, after the usual publication retries.
export function refreshWindow(now = Date.now()) {
  const date = new Date(now);
  const slots = [1, 6].map((day) => {
    const slot = new Date(now);
    slot.setUTCDate(date.getUTCDate() - (date.getUTCDay() - day + 7) % 7);
    slot.setUTCHours(6, 0, 0, 0);
    return +slot > now ? +slot - WEEK : +slot;
  });
  return { due: Math.max(...slots), next: Math.min(...slots.map((slot) => slot + WEEK)) };
}

export function newerSnapshot(current, incoming) {
  return Date.parse(incoming?.generatedAt) > Date.parse(current?.generatedAt ?? "1970-01-01") ? incoming : current;
}

export function validateSnapshot(snapshot, listKey) {
  if (!snapshot || !Number.isFinite(Date.parse(snapshot.generatedAt)) || !Array.isArray(snapshot[listKey])) {
    throw new Error("Invalid data snapshot");
  }
  return snapshot;
}

// One timer for the next weekly checkpoint; no interval polling or background fetches.
export function startWeeklyRefresh(refresh, {
  now = Date.now, visible = () => !document.hidden,
  online = () => navigator.onLine !== false,
  schedule = setTimeout, cancel = clearTimeout,
} = {}) {
  let completed = null;
  let running = false;
  let stopped = false;
  let timer;
  const check = async () => {
    const { due } = refreshWindow(now());
    if (stopped || running || !visible() || !online() || completed === due) return;
    running = true;
    try {
      // Mark the checkpoint at request start; crossing another checkpoint requires a new check.
      if (await refresh() !== false && !stopped) completed = due;
    } catch {
      // Keep old data. A later foreground / online event can retry.
    } finally {
      running = false;
      if (!stopped && completed === due && refreshWindow(now()).due !== due) void check();
    }
  };
  const arm = () => {
    if (stopped) return;
    timer = schedule(async () => {
      await check();
      arm();
    }, Math.max(1, refreshWindow(now()).next - now()));
  };
  arm();
  void check();
  return {
    check,
    stop() { stopped = true; cancel(timer); },
  };
}
