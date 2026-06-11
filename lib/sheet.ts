type CacheEntry = { data: string; expiresAt: number };

let cache: CacheEntry | null = null;

export async function getFaqCsv(): Promise<string> {
  const now = Date.now();

  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  const url = process.env.SHEET_CSV_URL;
  if (!url) {
    console.warn("[sheet] SHEET_CSV_URL not set");
    return cache?.data ?? "";
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    cache = { data: text, expiresAt: now + 60_000 };
    return text;
  } catch (err) {
    console.warn("[sheet] fetch failed:", err);
    return cache?.data ?? "";
  }
}
