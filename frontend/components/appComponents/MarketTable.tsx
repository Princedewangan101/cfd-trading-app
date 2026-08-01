"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

interface Ticker {
    s: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    V: string;
}

interface Market {
    wsSymbol: string;
    routeSymbol: string;
    displaySymbol: string;
}

const MARKETS: Market[] = [
    { wsSymbol: "BTC_USDC", routeSymbol: "BTCUSD", displaySymbol: "BTC" },
    { wsSymbol: "ETH_USDC", routeSymbol: "ETHUSD", displaySymbol: "ETH" },
    { wsSymbol: "SOL_USDC", routeSymbol: "SOLUSD", displaySymbol: "SOL" },
];

const GRID_COLS = "grid-cols-[2.2fr_1.4fr_1.2fr_1.2fr_1.2fr_1.6fr]";

const formatPrice = (value?: string) => {
    const number = Number(value);
    if (!value || Number.isNaN(number)) return "—";
    return number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatVolume = (value?: string) => {
    const number = Number(value);
    if (!value || Number.isNaN(number)) return "—";
    return "$" + new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(number);
};

const changePercent = (ticker?: Ticker) => {
    if (!ticker) return null;
    const open = Number(ticker.o);
    const last = Number(ticker.c);
    if (!open || Number.isNaN(open) || Number.isNaN(last)) return null;
    return ((last - open) / open) * 100;
};

const SkeletonRow = () => (
    <div className={`grid ${GRID_COLS} gap-3 border-b border-zinc-900 px-4 py-3 last:border-b-0`}>
        <div className="flex items-center gap-2.5">
            <div className="skeleton h-7 w-7 rounded-full" />
            <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="flex items-center justify-end">
            <div className="skeleton h-4 w-16 rounded" />
        </div>
        <div className="flex items-center justify-end">
            <div className="skeleton h-4 w-12 rounded" />
        </div>
        <div className="hidden items-center justify-end sm:flex">
            <div className="skeleton h-4 w-16 rounded" />
        </div>
        <div className="hidden items-center justify-end sm:flex">
            <div className="skeleton h-4 w-16 rounded" />
        </div>
        <div className="hidden items-center justify-end md:flex">
            <div className="skeleton h-4 w-16 rounded" />
        </div>
    </div>
);

const MarketTable = () => {
    const [tickers, setTickers] = useState<Record<string, Ticker>>({});
    const [search, setSearch] = useState<string>("");
    const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
    const lastPricesRef = useRef<Record<string, number>>({});

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_BACKPACK_URL) {
            console.log("\n> [ERROR] (MarketTable.tsx) : NEXT_PUBLIC_BACKPACK_URL is not defined in .env file");
            return;
        }

        let socket: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let destroyed = false;

        const connect = () => {
            socket = new WebSocket(process.env.NEXT_PUBLIC_BACKPACK_URL!);

            socket.onopen = () => {
                socket?.send(
                    JSON.stringify({
                        method: "SUBSCRIBE",
                        params: MARKETS.map((m) => `ticker.${m.wsSymbol}`),
                        id: 1,
                    })
                );
            };

            socket.onmessage = (event: MessageEvent) => {
                try {
                    const parsed = JSON.parse(event.data);
                    const data = parsed.data as Ticker;
                    if (!data?.s) return;

                    const last = Number(data.c);
                    const previous = lastPricesRef.current[data.s];

                    if (previous !== undefined && last !== previous) {
                        setFlash((prev) => ({
                            ...prev,
                            [data.s]: last > previous ? "up" : "down",
                        }));
                        setTimeout(() => {
                            setFlash((prev) => {
                                const next = { ...prev };
                                delete next[data.s];
                                return next;
                            });
                        }, 600);
                    }
                    lastPricesRef.current[data.s] = last;

                    setTickers((prev) => ({ ...prev, [data.s]: data }));
                } catch (error) {
                    console.log("\n> [ERROR] (MarketTable.tsx) :", (error as Error).message);
                }
            };

            socket.onclose = () => {
                console.log("\n> [INFO] (MarketTable.tsx) : ws closed, reconnecting in 1s");
                if (!destroyed) reconnectTimer = setTimeout(connect, 1000);
            };

            socket.onerror = (error) => {
                console.log("\n> [ERROR] (MarketTable.tsx) :", (error as unknown as Error).message);
            };
        };

        connect();

        return () => {
            destroyed = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            socket?.close();
        };
    }, []);

    const filteredMarkets = MARKETS.filter((m) =>
        m.displaySymbol.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-full">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center gap-3 pb-4">
                <h1 className="text-xl font-bold text-gray-100">Markets</h1>
                <div className="relative ml-auto w-full sm:w-64">
                    <svg
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search markets"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-600 outline-none transition-colors focus:border-zinc-600 focus:bg-zinc-900"
                    />
                </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-950">
                {/* HEADER */}
                <div className={`grid ${GRID_COLS} gap-3 border-b border-zinc-900 bg-zinc-900/40 px-4 py-2.5 text-xs uppercase tracking-wider text-gray-500`}>
                    <div className="font-medium">Market</div>
                    <div className="text-right font-medium">Last Price</div>
                    <div className="text-right font-medium">24h Change</div>
                    <div className="hidden text-right font-medium sm:block">24h High</div>
                    <div className="hidden text-right font-medium sm:block">24h Low</div>
                    <div className="hidden text-right font-medium md:block">24h Volume</div>
                </div>

                {/* ROWS */}
                {filteredMarkets.map((market) => {
                    const ticker = tickers[market.wsSymbol];
                    if (!ticker) return <SkeletonRow key={market.wsSymbol} />;

                    const percent = changePercent(ticker);
                    const percentColor = percent === null
                        ? "text-gray-600"
                        : percent >= 0 ? "text-emerald-500" : "text-red-500";
                    const flashClass = flash[market.wsSymbol] === "up"
                        ? "animate-flash-up"
                        : flash[market.wsSymbol] === "down" ? "animate-flash-down" : "";

                    return (
                        <Link
                            key={market.wsSymbol}
                            href={`/trade/${market.routeSymbol}`}
                            className={`group grid ${GRID_COLS} gap-3 border-b border-zinc-900 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-900/50`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-gray-300">
                                    {market.displaySymbol.charAt(0)}
                                </div>
                                <div className="text-sm font-semibold text-gray-100">
                                    {market.displaySymbol}
                                    <span className="font-normal text-gray-500"> / USD</span>
                                </div>
                            </div>

                            <div className={`flex items-center justify-end rounded px-1 text-right text-sm font-medium tabular-nums text-gray-100 ${flashClass}`}>
                                {formatPrice(ticker?.c)}
                            </div>

                            <div className={`text-right text-sm tabular-nums ${percentColor}`}>
                                {percent === null ? "—" : `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`}
                            </div>

                            <div className="hidden text-right text-sm tabular-nums text-gray-300 sm:block">
                                {formatPrice(ticker?.h)}
                            </div>

                            <div className="hidden text-right text-sm tabular-nums text-gray-300 sm:block">
                                {formatPrice(ticker?.l)}
                            </div>

                            <div className="hidden text-right text-sm tabular-nums text-gray-300 md:block">
                                {formatVolume(ticker?.V)}
                            </div>
                        </Link>
                    );
                })}

                {filteredMarkets.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-gray-600">
                        No markets match &ldquo;{search}&rdquo;
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketTable;
