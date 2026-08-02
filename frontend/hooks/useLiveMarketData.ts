"use client";

import { useEffect, useRef, useState } from "react";

export interface LiveTicker {
    symbol: string;
    lastPrice: number;
    open24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    quoteVolume24h: number;
    change24h: number;
}

export interface LiveCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    isClosed: boolean;
}

export interface LiveMarketData {
    ticker: LiveTicker | null;
    candle: LiveCandle | null;
    isConnected: boolean;
}

const toNumber = (value?: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

export function useLiveMarketData(symbol: string, timeFrame = "1m"): LiveMarketData {
    const [ticker, setTicker] = useState<LiveTicker | null>(null);
    const [candle, setCandle] = useState<LiveCandle | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const wsRef = useRef<WebSocket | null>(null);

    const base = symbol.slice(0, -3);
    const wsSymbol = `${base}_USDC`;

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_BACKPACK_URL || !wsSymbol) return;

        let destroyed = false;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        const connect = () => {
            if (destroyed) return;
            const ws: WebSocket = new WebSocket(process.env.NEXT_PUBLIC_BACKPACK_URL!);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                ws.send(
                    JSON.stringify({
                        method: "SUBSCRIBE",
                        params: [`ticker.${wsSymbol}`, `kline.${timeFrame}.${wsSymbol}`],
                        id: 1,
                    })
                );
            };

            ws.onmessage = (event: MessageEvent) => {
                if (destroyed) return;
                try {
                    const parsed = JSON.parse(event.data);
                    const stream: string | undefined = parsed.stream;
                    const data = parsed.data;

                    if (!stream || !data) return;

                    if (stream.startsWith("ticker.")) {
                        const open = toNumber(data.o);
                        setTicker({
                            symbol: data.s,
                            lastPrice: toNumber(data.c),
                            open24h: open,
                            high24h: toNumber(data.h),
                            low24h: toNumber(data.l),
                            volume24h: toNumber(data.v),
                            quoteVolume24h: toNumber(data.V),
                            change24h: open === 0 ? 0 : ((toNumber(data.c) - open) / open) * 100,
                        });
                    } else if (stream.startsWith("kline.")) {
                        setCandle({
                            time: Math.floor(new Date(`${data.t}Z`).getTime() / 1000),
                            open: toNumber(data.o),
                            high: toNumber(data.h),
                            low: toNumber(data.l),
                            close: toNumber(data.c),
                            isClosed: data.X === true,
                        });
                    }
                } catch (error) {
                    console.log("\n> [ERROR] (useLiveMarketData.ts) :", (error as Error).message);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                console.log("\n> [INFO] (useLiveMarketData.ts) : ws closed, reconnecting in 1s");
                if (!destroyed) reconnectTimer = setTimeout(connect, 1000);
            };

            ws.onerror = () => {
                ws.close();
            };
        };

        connect();

        return () => {
            destroyed = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [wsSymbol, timeFrame]);

    return { ticker, candle, isConnected };
}
