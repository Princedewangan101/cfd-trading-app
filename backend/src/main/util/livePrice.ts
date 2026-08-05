import { redis } from '../../config/redis.js';

// "BTCUSD" -> "BTC_USDC"
export const getWsSymbol = (symbol: string): string =>
    `${symbol.slice(0, -3)}_USDC`;

// returns the cached live price in dollars for a symbol, or null when not cached
export const getLivePrice = async (symbol: string): Promise<number | null> => {
    const cached = await redis.get(`LIVE-PRICE-${getWsSymbol(symbol)}`);
    if (!cached) return null;
    const price = Number(cached);
    return Number.isFinite(price) ? price : null;
};

// fallback close price (string, matching engineResult.closePrice) for when the
// engine round-trip times out; null when the poller hasn't cached a price.
export const getClosePrice = async (symbol: string): Promise<string | null> => {
    const live = await getLivePrice(symbol);
    return live === null ? null : String(live);
};
