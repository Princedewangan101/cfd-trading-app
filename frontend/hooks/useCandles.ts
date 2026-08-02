"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { config } from "@/lib/config";
import { BACKEND_URL } from "@/lib/url";

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface RawCandle {
    time: string | number;
    open: string | number;
    high: string | number;
    low: string | number;
    close: string | number;
}

export const mapCandles = (raw: RawCandle[]): Candle[] =>
    raw.map((candle) => ({
        time: Number(candle.time),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
    }));

async function fetchCandles(symbol: string, timeFrame: string): Promise<Candle[]> {
    const serverResponse = await axios.get(
        `${BACKEND_URL.candles}/${symbol}/${timeFrame}`,
        config
    );

    return mapCandles(serverResponse.data?.candles ?? []);
}

export function useCandles(symbol: string, timeFrame: string) {
    return useQuery({
        queryKey: ["candles", symbol, timeFrame],
        queryFn: () => fetchCandles(symbol, timeFrame),
        staleTime: 30000,
        retry: false,
    });
}
