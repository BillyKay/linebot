import { log } from "@/lib/log";

type CacheEntry = { text: string; expiresAt: number };

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

export async function fetchFAQ(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.text;

  const url = process.env.SHEET_CSV_URL;
  if (!url) {
    log.warn("sheet.url_not_set");
    return cache?.text ?? "";
  }

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`sheet fetch ${res.status}`);

    const csv = await res.text();
    const text = csvToFaqText(csv);
    cache = { text, expiresAt: now + CACHE_TTL_MS };
    return text;
  } catch (err) {
    if (cache) {
      log.warn("sheet.stale_cache", { err: String(err) });
      return cache.text;
    }
    log.error("sheet.fetch_failed", { err: String(err) });
    return "";
  }
}

function csvToFaqText(csv: string): string {
  // Sheet columns: question, answer, tags
  const lines = csv.split("\n").slice(1);
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const [question, answer, tags] = parseCSVLine(line);
      const prefix = tags ? `[${tags}] ` : "";
      return `${prefix}${question}\n→ ${answer}`;
    })
    .join("\n\n");
}

function parseCSVLine(line: string): [string, string, string] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return [result[0] ?? "", result[1] ?? "", result[2] ?? ""];
}
