import type { UTCTimestamp } from "lightweight-charts";

const MINUTE = 60;
const CANDLE_COUNT = 80;

export const dummyData = Array.from({ length: CANDLE_COUNT }, (_, i) => {
    const time = (Math.floor(Date.now() / 1000) - (CANDLE_COUNT - i) * MINUTE) as UTCTimestamp;
    const open = 150 + Math.sin(i / 6) * 6 + (i % 9) - 4;
    const close = 150 + Math.sin((i + 1) / 6) * 6 + ((i + 1) % 9) - 4;
    const high = Math.max(open, close) + 1 + (i % 3);
    const low = Math.min(open, close) - 1 - (i % 3);
    return {
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
    };
});
