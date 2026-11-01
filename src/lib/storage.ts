/** localStorage that never throws (private windows, blocked storage). Per-browser conveniences only. */
export function load<T extends string>(key: string, fallback: T): T {
  try {
    return (window.localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

export function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch { /* ignore */ }
}
