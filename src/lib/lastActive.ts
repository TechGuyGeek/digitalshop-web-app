export type LastActiveTone = "green" | "amber" | "red" | "neutral";

export interface LastActiveStatus {
  tone: LastActiveTone;
  daysAgo: number | null;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseUtcTimestamp(value: string): number {
  const normalized = value.trim();
  if (!normalized) return Number.NaN;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return Date.parse(`${normalized.replace(" ", "T")}Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return Date.parse(`${normalized}T00:00:00Z`);
  }
  return Date.parse(normalized);
}

/** Uses UTC elapsed time so the native thresholds are deterministic in every browser timezone. */
export function resolveLastActive(lastLoggedOn: string | null | undefined, now = new Date()): LastActiveStatus {
  const timestamp = typeof lastLoggedOn === "string" ? parseUtcTimestamp(lastLoggedOn) : Number.NaN;
  const nowMilliseconds = now.getTime();
  if (!Number.isFinite(timestamp) || !Number.isFinite(nowMilliseconds)) {
    return { tone: "neutral", daysAgo: null };
  }

  const elapsedMilliseconds = Math.max(0, nowMilliseconds - timestamp);
  const daysAgo = Math.floor(elapsedMilliseconds / MILLISECONDS_PER_DAY);
  if (elapsedMilliseconds <= MILLISECONDS_PER_DAY) return { tone: "green", daysAgo };
  if (elapsedMilliseconds <= 7 * MILLISECONDS_PER_DAY) return { tone: "amber", daysAgo };
  return { tone: "red", daysAgo };
}

export function formatLastActive(status: LastActiveStatus, translate: (key: string) => string): string {
  const localized = (key: string, fallback: string) => {
    const value = translate(key);
    return value && value !== key ? value : fallback;
  };
  if (status.daysAgo === null) return localized("LastActiveUnavailable", "Last active unavailable");
  if (status.daysAgo === 0) return localized("LastActiveToday", "Last active today");
  if (status.daysAgo === 1) return localized("LastActiveDayAgo", "Last active 1 day ago");
  return localized("LastActiveDaysAgo", `Last active ${status.daysAgo} days ago`).replace("{days}", String(status.daysAgo));
}
