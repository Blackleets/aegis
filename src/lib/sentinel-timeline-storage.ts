import { safeStorageGetJson, safeStorageSet, type StorageLike } from './safe-browser-storage';

export type SentinelTimelineEntry = {
  label: string;
  at: string;
};

export const SENTINEL_TIMELINE_STORAGE_KEY = 'aegis-sentinel-timeline';
const MAX_SENTINEL_TIMELINE_ENTRIES = 5;

function isTimelineEntry(value: unknown): value is SentinelTimelineEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SentinelTimelineEntry>;
  return typeof candidate.label === 'string'
    && candidate.label.trim().length > 0
    && typeof candidate.at === 'string'
    && !Number.isNaN(Date.parse(candidate.at));
}

export function normalizeSentinelTimeline(value: unknown): SentinelTimelineEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isTimelineEntry)
    .slice(0, MAX_SENTINEL_TIMELINE_ENTRIES);
}

export function loadSentinelTimeline(storage?: StorageLike | null): SentinelTimelineEntry[] {
  const result = safeStorageGetJson<unknown>(SENTINEL_TIMELINE_STORAGE_KEY, [], storage);
  return normalizeSentinelTimeline(result.value);
}

export function saveSentinelTimeline(
  entries: SentinelTimelineEntry[],
  storage?: StorageLike | null,
): boolean {
  const normalized = normalizeSentinelTimeline(entries);
  return safeStorageSet(
    SENTINEL_TIMELINE_STORAGE_KEY,
    JSON.stringify(normalized),
    storage,
  ).value === true;
}

export function prependSentinelTimelineEntry(
  entries: SentinelTimelineEntry[],
  label: string,
  now: Date = new Date(),
): SentinelTimelineEntry[] {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return normalizeSentinelTimeline(entries);

  return normalizeSentinelTimeline([
    { label: trimmedLabel, at: now.toISOString() },
    ...entries,
  ]);
}
