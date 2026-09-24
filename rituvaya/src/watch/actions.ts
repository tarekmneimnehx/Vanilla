/**
 * What the watch sends back. One shape covers taps in the watch list and the
 * action buttons on notifications shown on the watch, so the phone applies both
 * through the same path.
 */
export type WatchActionKind = 'taken' | 'skip' | 'snooze' | 'tonight';

export interface WatchAction {
  /**
   * Unique per tap. The watch sends each tap twice — an immediate message and a
   * queued transfer that survives the phone being out of reach — and the id is
   * what lets the phone count it once.
   */
  id: string;
  action: WatchActionKind;
  /** Occurrence keys from the payload the watch was shown, or from the notification. */
  keys: string[];
  /** When the user tapped, on the watch's clock. */
  at: number;
}

const KINDS: readonly WatchActionKind[] = ['taken', 'skip', 'snooze', 'tonight'];

/**
 * Messages arrive from native code on another device, so anything that isn't
 * exactly the expected shape is dropped rather than partly applied.
 */
export function parseWatchAction(raw: unknown): WatchAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.type !== 'action') return null;
  if (typeof r.action !== 'string' || !KINDS.includes(r.action as WatchActionKind)) return null;
  if (typeof r.id !== 'string' || r.id.length === 0) return null;
  if (!Array.isArray(r.keys) || r.keys.length === 0 || !r.keys.every((k) => typeof k === 'string' && k.length > 0)) return null;
  if (typeof r.at !== 'number' || !Number.isFinite(r.at)) return null;
  return { id: r.id, action: r.action as WatchActionKind, keys: [...(r.keys as string[])], at: r.at };
}
