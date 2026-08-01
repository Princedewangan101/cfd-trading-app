"use client";
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import solanalogo from "../../../asset/solanalogo.png";
import BalanceBox from './BalanceBox';

interface Ticker {
    s: string;
    o: string;
    c: string;
    h: string;
    l: string;
}

const getSymbolMeta = (symbol: string) => {
    const base = symbol.slice(0, -3);
    const wsSymbol = `${base}_USDC`;
    const image = base === "SOL" ? solanalogo : undefined;
    const gradient = base === "BTC"
        ? "from-orange-500 to-orange-700"
        : base === "ETH"
            ? "from-indigo-500 to-indigo-700"
            : "from-cyan-500 to-cyan-700";
    return { base, wsSymbol, image, gradient };
};

const formatPrice = (value?: string) => {
    const number = Number(value);
    if (!value || Number.isNaN(number)) return "—";
    return number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const Topbar = ({ symbol }: { symbol: string }) => {
    const { base, wsSymbol, image, gradient } = getSymbolMeta(symbol);
    const [ticker, setTicker] = useState<Ticker | null>(null);

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_BACKPACK_URL) return;

        let socket: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let destroyed = false;

        const connect = () => {
            socket = new WebSocket(process.env.NEXT_PUBLIC_BACKPACK_URL!);

            socket.onopen = () => {
                socket?.send(
                    JSON.stringify({
                        method: "SUBSCRIBE",
                        params: [`ticker.${wsSymbol}`],
                        id: 1,
                    })
                );
            };

            socket.onmessage = (event: MessageEvent) => {
                try {
                    const parsed = JSON.parse(event.data);
                    const data = parsed.data as Ticker;
                    if (data?.s === wsSymbol) setTicker(data);
                } catch (error) {
                    console.log("\n> [ERROR] (Topbar.tsx) :", (error as Error).message);
                }
            };

            socket.onclose = () => {
                console.log("\n> [INFO] (Topbar.tsx) : ws closed, reconnecting in 1s");
                if (!destroyed) reconnectTimer = setTimeout(connect, 1000);
            };
        };

        connect();

        return () => {
            destroyed = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            socket?.close();
        };
    }, [wsSymbol]);

    const percent = ticker
        ? ((Number(ticker.c) - Number(ticker.o)) / Number(ticker.o)) * 100
        : null;
    const percentColor = percent === null
        ? "text-gray-600"
        : percent >= 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500";

    return (
        <div className='flex h-10 items-center justify-between gap-3 rounded bg-zinc-950 px-2 py-1'>
            {/* SYMBOL + LIVE PRICE */}
            <div className='flex items-center gap-2'>
                {image ? (
                    <Image src={image} alt={`${base}-logo`} width={24} className='rounded-full' />
                ) : (
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-[10px] font-bold text-white`}>
                        {base.charAt(0)}
                    </span>
                )}
                <p className='text-sm font-bold text-gray-100'>
                    {base}
                    <span className='font-normal text-gray-500'> / USD</span>
                </p>

                <div className='ml-3 flex items-center gap-2'>
                    <p className='text-sm font-medium tabular-nums text-gray-100'>
                        {ticker ? formatPrice(ticker.c) : "—"}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${percentColor}`}>
                        {percent === null ? "—" : `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`}
                    </span>
                </div>
            </div>

            {/* 24H STATS */}
            <div className='hidden items-center gap-4 md:flex'>
                <div className='leading-tight'>
                    <p className='text-[10px] uppercase tracking-wider text-gray-500'>24h High</p>
                    <p className='tabular-nums text-xs text-gray-300'>{ticker ? formatPrice(ticker.h) : "—"}</p>
                </div>
                <div className='leading-tight'>
                    <p className='text-[10px] uppercase tracking-wider text-gray-500'>24h Low</p>
                    <p className='tabular-nums text-xs text-gray-300'>{ticker ? formatPrice(ticker.l) : "—"}</p>
                </div>
            </div>

            {/* EQUITY */}
            <div className='flex items-center gap-2'>
                <BalanceBox />
            </div>
        </div>
    )
}

export default Topbar
