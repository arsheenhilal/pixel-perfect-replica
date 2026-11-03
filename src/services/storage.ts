// Temporary localStorage persistence until the REST backend is ready.
// Swap these functions for API calls (see src/services/api.ts) later.
import { useSyncExternalStore } from "react";

const PREFIX = "booknook:";
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(PREFIX + key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return (hit.value ?? fallback) as T;
  let value: unknown = fallback;
  try { value = raw ? JSON.parse(raw) : fallback; } catch { /* ignore */ }
  cache.set(key, { raw, value });
  return value as T;
}

export function write<T>(key: string, value: T) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  listeners.forEach((l) => l());
}

export function useStore<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const value = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => read(key, fallback),
    () => fallback,
  );
  const set = (v: T | ((p: T) => T)) => write(key, typeof v === "function" ? (v as (p: T) => T)(read(key, fallback)) : v);
  return [value, set];
}

export type Shelf = "wishlist" | "reading" | "completed";
export interface ShelfItem {
  key: string; // `${source}:${id}`
  id: string;
  source: string;
  title: string;
  authors: string[];
  cover?: string;
  shelf: Shelf;
  addedAt: number;
}
export interface Progress { key: string; title: string; cover?: string; authors: string[]; source: string; id: string; page: number; total: number; scroll: number; updatedAt: number }
export interface Bookmark { id: string; bookKey: string; title: string; page: number; createdAt: number }
export interface Note { id: string; bookKey: string; title: string; page: number; quote?: string; text: string; createdAt: number }
export interface Highlight { id: string; bookKey: string; page: number; text: string }
export interface HistoryEntry { key: string; title: string; source: string; id: string; at: number }
export interface User { name: string; email: string; joinedAt: number }

export const EMPTY: never[] = [];
export const EMPTY_OBJ = {} as Record<string, Progress>;
