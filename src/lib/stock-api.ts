// Alpha Vantage — free tier: 25 req/min
// Get your key at https://www.alphavantage.co/support/#api-key
const ALPHA_VANTAGE_API_KEY = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY ?? "demo";

const AV_BASE_URL = "https://www.alphavantage.co/query";

// CoinGecko — free tier: 10-30 req/min, no key needed
const CG_BASE_URL = "https://api.coingecko.com/api/v3";

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

// ─── Stock Quotes (Alpha Vantage) ───

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const cacheKey = `quote:${ticker}`;
  const cached = getCached<StockQuote>(cacheKey);
  if (cached) return cached;

  const url = `${AV_BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error ${response.status} fetching quote for "${ticker}"`);
  }
  const json = await response.json();

  const raw = json["Global Quote"];
  if (!raw || !raw["05. price"]) {
    throw new Error(`No quote data for "${ticker}"`);
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
  const url = `${AV_BASE_URL}?function=${fn}&symbol=${encodeURIComponent(ticker)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error ${response.status} fetching history for "${ticker}"`);
  }
  const json = await response.json();

  const seriesKey = PERIOD_KEY_MAP[period];
  const series = json[seriesKey];
  if (!series) {
    throw new Error(`No ${period} history data for "${ticker}"`);
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

// ─── Crypto Quotes (CoinGecko) ───

// Common crypto tickers → CoinGecko IDs
const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  XRP: "ripple",
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
  LTC: "litecoin",
  BNB: "binancecoin",
};

export function isCryptoTicker(ticker: string): boolean {
  return ticker.toUpperCase() in CRYPTO_ID_MAP;
}

export async function getCryptoQuote(ticker: string): Promise<StockQuote> {
  const upper = ticker.toUpperCase();
  const coinId = CRYPTO_ID_MAP[upper];
  if (!coinId) {
    throw new Error(`Unknown crypto ticker "${ticker}". Add it to CRYPTO_ID_MAP.`);
  }

  const cacheKey = `crypto:${coinId}`;
  const cached = getCached<StockQuote>(cacheKey);
  if (cached) return cached;

  const url = `${CG_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=false`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error ${response.status} fetching crypto quote for "${ticker}"`);
  }
  const json = await response.json();

  const data = json[coinId];
  if (!data) {
    throw new Error(`No CoinGecko data for "${ticker}"`);
  }

  const quote: StockQuote = {
    price: data.usd ?? 0,
    change: 0, // CoinGecko simple endpoint doesn't give absolute change
    changePercent: data.usd_24h_change ?? 0,
    high: 0,
    low: 0,
  };

  setCache(cacheKey, quote);
  return quote;
}

// ─── Symbol Search (Alpha Vantage) ───

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
}

export async function searchSymbol(
  keywords: string
): Promise<SymbolSearchResult[]> {
  const cacheKey = `search:${keywords.toUpperCase()}`;
  const cached = getCached<SymbolSearchResult[]>(cacheKey);
  if (cached) return cached;

  // Check crypto matches first
  const upper = keywords.toUpperCase();
  const cryptoMatches: SymbolSearchResult[] = Object.entries(CRYPTO_ID_MAP)
    .filter(([ticker, name]) => ticker.includes(upper) || name.toUpperCase().includes(upper))
    .map(([ticker, name]) => ({
      symbol: ticker,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      type: "Crypto",
      region: "Global",
    }));

  const url = `${AV_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error ${response.status} searching for "${keywords}"`);
  }
  const json = await response.json();

  const matches = json["bestMatches"] ?? [];
  const stockResults: SymbolSearchResult[] = matches.map((m: any) => ({
    symbol: m["1. symbol"],
    name: m["2. name"],
    type: m["3. type"],
    region: m["4. region"],
  }));

  const results = [...cryptoMatches, ...stockResults];
  setCache(cacheKey, results);
  return results;
}

// ─── Unified Quote Fetcher ───

export async function getQuote(ticker: string): Promise<StockQuote> {
  if (isCryptoTicker(ticker)) {
    return getCryptoQuote(ticker);
  }
  return getStockQuote(ticker);
}

// Batch fetch quotes for multiple tickers (parallel, with error handling)
export async function getBatchQuotes(
  tickers: string[]
): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];

  const settled = await Promise.allSettled(
    unique.map(async (ticker) => {
      const quote = await getQuote(ticker);
      return { ticker, quote };
    })
  );

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.set(result.value.ticker, result.value.quote);
    }
  }

  return results;
}
