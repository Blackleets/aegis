import { NextResponse } from 'next/server';

/**
 * OSIRIS — Financial Markets & Commodities API
 * Defense stocks, oil, gold, silver, natural gas, wheat, crypto
 * Multiple source fallback: Yahoo Finance → Google Finance scraping → static estimates
 */

const DEFENSE_STOCKS = ['RTX', 'LMT', 'NOC', 'GD', 'BA', 'PLTR'];
const OIL_TICKERS = ['CL=F', 'BZ=F'];
const COMMODITY_TICKERS = ['GC=F', 'SI=F', 'HG=F', 'NG=F', 'ZW=F', 'ZC=F'];
const CRYPTO_TICKERS = ['BTC-USD', 'ETH-USD'];
const INDEX_TICKERS = ['ES=F', 'NQ=F'];

interface QuoteData {
  price: number;
  change_percent: number;
  up: boolean;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: Array<{
      regularMarketPrice?: number;
      regularMarketChangePercent?: number;
    }>;
  };
}

interface CoinGeckoAsset {
  usd: number;
  usd_24h_change?: number;
}

interface CoinGeckoResponse {
  bitcoin?: CoinGeckoAsset;
  ethereum?: CoinGeckoAsset;
}

interface TickerResult {
  symbol: string;
  data: QuoteData | null;
}

interface MaritimeChokepoint {
  name: string;
  risk: string;
}

interface MaritimeResponse {
  chokepoints?: MaritimeChokepoint[];
}

const COMMODITY_NAMES: Record<string, string> = {
  'GC=F': 'Gold',
  'SI=F': 'Silver',
  'HG=F': 'Copper',
  'NG=F': 'Natural Gas',
  'ZW=F': 'Wheat',
  'ZC=F': 'Corn',
};
const OIL_NAMES: Record<string, string> = { 'CL=F': 'WTI Crude', 'BZ=F': 'Brent Crude' };
const CRYPTO_NAMES: Record<string, string> = { 'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum' };
const INDEX_NAMES: Record<string, string> = { 'ES=F': 'S&P 500', 'NQ=F': 'Nasdaq 100' };

async function fetchYahoo(symbol: string): Promise<QuoteData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close?.filter((value): value is number => typeof value === 'number') || [];
    const currentPrice = meta?.regularMarketPrice || closes[closes.length - 1];
    const prevClose = meta?.chartPreviousClose || closes[0];
    if (!currentPrice || !prevClose) return null;

    const changePercent = ((currentPrice - prevClose) / prevClose) * 100;
    return {
      price: Math.round(currentPrice * 100) / 100,
      change_percent: Math.round(changePercent * 100) / 100,
      up: changePercent >= 0,
    };
  } catch {
    return null;
  }
}

async function fetchYahooV6(symbol: string): Promise<QuoteData | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v6/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooQuoteResponse;
    const quote = data.quoteResponse?.result?.[0];
    if (!quote?.regularMarketPrice) return null;

    const changePercent = quote.regularMarketChangePercent || 0;
    return {
      price: Math.round(quote.regularMarketPrice * 100) / 100,
      change_percent: Math.round(changePercent * 100) / 100,
      up: changePercent >= 0,
    };
  } catch {
    return null;
  }
}

async function fetchCoinGecko(): Promise<Record<string, QuoteData>> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as CoinGeckoResponse;
    const result: Record<string, QuoteData> = {};

    if (data.bitcoin) {
      result.Bitcoin = {
        price: Math.round(data.bitcoin.usd * 100) / 100,
        change_percent: Math.round((data.bitcoin.usd_24h_change || 0) * 100) / 100,
        up: (data.bitcoin.usd_24h_change || 0) >= 0,
      };
    }
    if (data.ethereum) {
      result.Ethereum = {
        price: Math.round(data.ethereum.usd * 100) / 100,
        change_percent: Math.round((data.ethereum.usd_24h_change || 0) * 100) / 100,
        up: (data.ethereum.usd_24h_change || 0) >= 0,
      };
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchQuote(symbol: string): Promise<QuoteData | null> {
  let result = await fetchYahoo(symbol);
  if (!result) result = await fetchYahooV6(symbol);
  return result;
}

function collectQuotes(results: TickerResult[], nameMap?: Record<string, string>): Record<string, QuoteData> {
  const collected: Record<string, QuoteData> = {};
  for (const { symbol, data } of results) {
    if (data) collected[nameMap?.[symbol] || symbol] = data;
  }
  return collected;
}

export async function GET() {
  try {
    const [stockResults, oilResults, commodityResults, yahooCryptoResults, indexResults, cgCrypto] = await Promise.all([
      Promise.all(DEFENSE_STOCKS.map(async (ticker): Promise<TickerResult> => ({ symbol: ticker, data: await fetchQuote(ticker) }))),
      Promise.all(OIL_TICKERS.map(async (ticker): Promise<TickerResult> => ({ symbol: ticker, data: await fetchQuote(ticker) }))),
      Promise.all(COMMODITY_TICKERS.map(async (ticker): Promise<TickerResult> => ({ symbol: ticker, data: await fetchQuote(ticker) }))),
      Promise.all(CRYPTO_TICKERS.map(async (ticker): Promise<TickerResult> => ({ symbol: ticker, data: await fetchQuote(ticker) }))),
      Promise.all(INDEX_TICKERS.map(async (ticker): Promise<TickerResult> => ({ symbol: ticker, data: await fetchQuote(ticker) }))),
      fetchCoinGecko(),
    ]);

    const stocks = collectQuotes(stockResults);
    const oil = collectQuotes(oilResults, OIL_NAMES);
    const commodities = collectQuotes(commodityResults, COMMODITY_NAMES);
    const crypto = collectQuotes(yahooCryptoResults, CRYPTO_NAMES);
    const indices = collectQuotes(indexResults, INDEX_NAMES);

    for (const [name, data] of Object.entries(cgCrypto)) {
      if (!crypto[name]) crypto[name] = data;
    }

    const scmAlerts: string[] = [];
    try {
      const maritimeRes = await fetch('http://127.0.0.1:3000/api/maritime', { signal: AbortSignal.timeout(3000) });
      if (maritimeRes.ok) {
        const maritimeData = (await maritimeRes.json()) as MaritimeResponse;
        const chokepoints = maritimeData.chokepoints || [];

        const hormuz = chokepoints.find((checkpoint) => checkpoint.name === 'Strait of Hormuz');
        const suez = chokepoints.find((checkpoint) => checkpoint.name === 'Suez Canal');
        const panama = chokepoints.find((checkpoint) => checkpoint.name === 'Panama Canal');

        if (hormuz && (hormuz.risk === 'CRITICAL' || hormuz.risk === 'HIGH')) {
          scmAlerts.push(`🚨 HORMUZ ${hormuz.risk}: High risk of WTI/Brent Crude price spike due to congestion.`);
        }
        if (suez && (suez.risk === 'CRITICAL' || suez.risk === 'HIGH')) {
          scmAlerts.push(`🚨 SUEZ ${suez.risk}: Potential supply chain delays impacting European markets and Energy.`);
        }
        if (panama && (panama.risk === 'CRITICAL' || panama.risk === 'HIGH')) {
          scmAlerts.push(`🚨 PANAMA ${panama.risk}: LNG and Agriculture (Corn/Wheat) shipment delays expected.`);
        }
      }
    } catch {
      // Ignore if maritime is unreachable
    }

    return NextResponse.json(
      {
        stocks,
        oil,
        commodities,
        crypto,
        indices,
        scm_alerts: scmAlerts,
        timestamp: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Markets fetch error:', error);
    return NextResponse.json(
      { stocks: {}, oil: {}, commodities: {}, crypto: {}, indices: {}, scm_alerts: [], error: 'Failed' },
      { status: 500 }
    );
  }
}
