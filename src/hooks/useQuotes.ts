import { useState, useEffect, useRef } from "react";
import { getBatchQuotes, type StockQuote } from "@/src/lib/stock-api";

/**
 * Fetches live quotes for a list of tickers.
 * Auto-refreshes every `refreshInterval` ms (default 5 min).
 * Returns a map of ticker → StockQuote, plus loading/error state.
 */
export function useQuotes(
  tickers: string[],
  refreshInterval = 15 * 60 * 1000
) {
  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tickerKey = tickers.sort().join(",");

  useEffect(() => {
    if (tickers.length === 0) {
      setQuotes(new Map());
      return;
    }

    let cancelled = false;

    const fetchQuotes = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await getBatchQuotes(tickers);
        if (!cancelled) {
          setQuotes(results);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to fetch quotes");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchQuotes();

    intervalRef.current = setInterval(fetchQuotes, refreshInterval);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tickerKey, refreshInterval]);

  return { quotes, loading, error };
}
