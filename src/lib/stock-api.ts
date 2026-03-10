// TODO: Replace with your Alpha Vantage API key from https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_API_KEY = "YOUR_ALPHA_VANTAGE_API_KEY";

const BASE_URL = "https://www.alphavantage.co/query";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

export interface StockHistoryEntry {
  date: string;
  close: number;
  volume: number;
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const cacheKey = `quote:${ticker}`;
  const cached = getCached<StockQuote>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const response = await fetch(url);
  const json = await response.json();

  const raw = json["Global Quote"];
  if (!raw) {
    throw new Error(`No quote data found for ticker "${ticker}"`);
  }

  const quote: StockQuote = {
    price: parseFloat(raw["05. price"]),
    change: parseFloat(raw["09. change"]),
    changePercent: parseFloat(raw["10. change percent"]?.replace("%", "")),
    high: parseFloat(raw["03. high"]),
    low: parseFloat(raw["04. low"]),
  };

  setCache(cacheKey, quote);
  return quote;
}

const PERIOD_FUNCTION_MAP: Record<string, string> = {
  daily: "TIME_SERIES_DAILY",
  weekly: "TIME_SERIES_WEEKLY",
  monthly: "TIME_SERIES_MONTHLY",
};

const PERIOD_KEY_MAP: Record<string, string> = {
  daily: "Time Series (Daily)",
  weekly: "Weekly Time Series",
  monthly: "Monthly Time Series",
};

export async function getStockHistory(
  ticker: string,
  period: "daily" | "weekly" | "monthly"
): Promise<StockHistoryEntry[]> {
  const cacheKey = `history:${ticker}:${period}`;
  const cached = getCached<StockHistoryEntry[]>(cacheKey);
  if (cached) return cached;

  const fn = PERIOD_FUNCTION_MAP[period];
  const url = `${BASE_URL}?function=${fn}&symbol=${encodeURIComponent(ticker)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const response = await fetch(url);
  const json = await response.json();

  const seriesKey = PERIOD_KEY_MAP[period];
  const series = json[seriesKey];
  if (!series) {
    throw new Error(`No ${period} history data found for ticker "${ticker}"`);
  }

  const history: StockHistoryEntry[] = Object.entries(series).map(
    ([date, values]: [string, any]) => ({
      date,
      close: parseFloat(values["4. close"]),
      volume: parseInt(values["5. volume"], 10),
    })
  );

  setCache(cacheKey, history);
  return history;
}
