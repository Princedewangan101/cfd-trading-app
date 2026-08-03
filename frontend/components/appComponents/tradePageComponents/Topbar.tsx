"use client";
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, ChevronDown, Plus, Star } from 'lucide-react'
import BalanceBox from './BalanceBox';
import RampBox from './RampBox';
import AvatarMenu from '../AvatarMenu';
import { CryptoIcon } from '../Crypto';
import { useMarketStore } from '@/store/marketStore';
import { useAppStore } from '@/store/store';

const SYMBOLS = ["BTC", "ETH", "SOL"];

interface Ticker {
    s: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    V: string;
}

const getSymbolMeta = (symbol: string) => {
    const base = symbol.slice(0, -3);
    const wsSymbol = `${base}_USDC`;
    return { base, wsSymbol };
};

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

const Topbar = ({ symbol }: { symbol: string }) => {
    const router = useRouter();
    const { base, wsSymbol } = getSymbolMeta(symbol);
    const userId = useAppStore((state) => state.userId);
    const [tickers, setTickers] = useState<Record<string, Ticker>>({});
    const setMarketPrice = useMarketStore((state) => state.setPrice);
    const [favorites, setFavorites] = useState<string[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            return JSON.parse(window.localStorage.getItem("favoriteSymbols") || "[]");
        } catch {
            return [];
        }
    });
    const [filter, setFilter] = useState<"symbols" | "favorites">("symbols");
    const symbolRef = useRef<HTMLDivElement>(null);
    const [symbolDropdownOpen, setSymbolDropdownOpen] = useState<boolean>(false);
    const rampRef = useRef<HTMLDivElement>(null);
    const [rampOpen, setRampOpen] = useState<boolean>(false);

    useEffect(() => {
        window.localStorage.setItem("favoriteSymbols", JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        if (!symbolDropdownOpen) return
        const handleClick = (event: MouseEvent) => {
            if (symbolRef.current && !symbolRef.current.contains(event.target as Node)) {
                setSymbolDropdownOpen(false)
            }
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setSymbolDropdownOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        document.addEventListener("keydown", handleKey)
        return () => {
            document.removeEventListener("mousedown", handleClick)
            document.removeEventListener("keydown", handleKey)
        }
    }, [symbolDropdownOpen])

    useEffect(() => {
        if (!rampOpen) return
        const handleClick = (event: MouseEvent) => {
            if (rampRef.current && !rampRef.current.contains(event.target as Node)) {
                setRampOpen(false)
            }
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setRampOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        document.addEventListener("keydown", handleKey)
        return () => {
            document.removeEventListener("mousedown", handleClick)
            document.removeEventListener("keydown", handleKey)
        }
    }, [rampOpen])

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
                        params: SYMBOLS.map((sym) => `ticker.${sym}_USDC`),
                        id: 1,
                    })
                );
            };

            socket.onmessage = (event: MessageEvent) => {
                try {
                    const parsed = JSON.parse(event.data);
                    const data = parsed.data as Ticker;
                    if (data?.s) {
                        setTickers((prev) => ({ ...prev, [data.s]: data }));
                        setMarketPrice(data.s.slice(0, -5), Number(data.c));
                    }
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
    }, [setMarketPrice]);

    const ticker = tickers[wsSymbol] ?? null;

    const percent = ticker
        ? ((Number(ticker.c) - Number(ticker.o)) / Number(ticker.o)) * 100
        : null;
    const percentColor = percent === null
        ? "text-gray-600"
        : percent >= 0 ? "text-emerald-500" : "text-red-500";

    function toggleFavorite(sym: string) {
        setFavorites((prev) =>
            prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
        );
    }

    const filteredSymbols = filter === "favorites"
        ? SYMBOLS.filter((sym) => favorites.includes(sym))
        : SYMBOLS;

    return (
        <div className='flex h-10 items-center justify-between gap-3 rounded bg-zinc-950 px-2 py-1'>
            {/* SYMBOL + LIVE PRICE */}
            <div className='flex items-center gap-3'>
                <div ref={symbolRef} className='relative'>
                    <button
                        type="button"
                        onClick={() => setSymbolDropdownOpen((prev) => !prev)}
                        className='flex cursor-pointer items-center gap-1.5'
                    >
                        <CryptoIcon base={base} size={24} />
                        <p className='text-sm font-bold text-gray-100'>
                            {base}
                            <span className='font-normal text-gray-500'> / USD</span>
                        </p>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${symbolDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {symbolDropdownOpen && (
                        <div className='absolute left-0 top-full z-40 mt-1 w-80 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-md'>
                            {/* FILTER TABS */}
                            <div className='flex gap-1 border-b border-zinc-800 p-1.5'>
                                <button
                                    type="button"
                                    onClick={() => setFilter("favorites")}
                                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${filter === "favorites" ? "bg-zinc-800 text-gray-100" : "text-gray-400 hover:text-gray-200"}`}
                                >
                                    Favorites
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilter("symbols")}
                                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${filter === "symbols" ? "bg-zinc-800 text-gray-100" : "text-gray-400 hover:text-gray-200"}`}
                                >
                                    Symbols
                                </button>
                            </div>

                            {/* COLUMN HEADER */}
                            <div className='flex items-center justify-between gap-3 border-b border-zinc-800 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500'>
                                <span>Symbol</span>
                                <div className='flex items-center gap-3'>
                                    <span className='text-right'>Price</span>
                                    <span className='w-11 text-right'>24h%</span>
                                    <span className='w-12 text-right'>Volume</span>
                                </div>
                            </div>

                            {/* ROWS */}
                            <div className='max-h-64 overflow-y-auto'>
                                {filteredSymbols.length === 0 && (
                                    <p className='px-3 py-6 text-center text-xs text-gray-500'>No favorites yet</p>
                                )}
                                {filteredSymbols.map((sym) => {
                                    const data = tickers[`${sym}_USDC`];
                                    const symPercent = data
                                        ? ((Number(data.c) - Number(data.o)) / Number(data.o)) * 100
                                        : null;
                                    const isFav = favorites.includes(sym);
                                    return (
                                        <div key={sym} className='flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-zinc-800/60'>
                                            <div className='flex items-center gap-2'>
                                                <CryptoIcon base={sym} size={20} />
                                                <button
                                                    type="button"
                                                    onClick={() => { setSymbolDropdownOpen(false); router.push(`/trade/${sym}USD`) }}
                                                    className='text-sm font-medium text-gray-100 hover:text-gray-50'
                                                >
                                                    {sym}
                                                </button>
                                            </div>
                                            <div className='flex items-center gap-3'>
                                                <span className='text-sm tabular-nums text-gray-200'>{data ? `$${formatPrice(data.c)}` : "—"}</span>
                                                <span className={`w-11 text-right text-[10px] tabular-nums ${symPercent === null ? "text-gray-500" : symPercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                    {symPercent === null ? "—" : `${symPercent >= 0 ? "+" : ""}${symPercent.toFixed(2)}%`}
                                                </span>
                                                <span className='w-12 text-right text-xs tabular-nums text-gray-500'>{formatVolume(data?.V)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFavorite(sym)}
                                                    className={`p-0.5 ${isFav ? "text-amber-400" : "text-gray-500 hover:text-gray-300"}`}
                                                    aria-label={`${isFav ? "Remove" : "Add"} ${sym} to favorites`}
                                                >
                                                    <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400" : ""}`} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className='ml-4 flex items-center gap-2'>
                    {!ticker ? (
                        <div className='skeleton h-6 w-24 rounded' />
                    ) : (
                        <p className='text-lg font-medium tabular-nums text-gray-100'>
                            {`$${formatPrice(ticker.c)}`}
                        </p>
                    )}
                    {!ticker ? (
                        <div className='skeleton h-4 w-12 rounded' />
                    ) : (
                        <span className={`text-[11px] font-medium tabular-nums ${percentColor}`}>
                            {percent! >= 0 ? "+" : ""}{percent!.toFixed(2)}%
                        </span>
                    )}
                </div>

                {/* 24H STATS */}
                <div className='ml-4 hidden items-center gap-5 md:flex'>
                    <div className='leading-tight'>
                        <p className='flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500'>
                            24h High
                        </p>
                        {!ticker ? (
                            <div className='skeleton mt-0.5 h-4 w-16 rounded' />
                        ) : (
                            <p className='tabular-nums text-xs text-gray-300'>{formatPrice(ticker.h)}</p>
                        )}
                    </div>
                    <div className='leading-tight'>
                        <p className='flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500'>
                            24h Low
                        </p>
                        {!ticker ? (
                            <div className='skeleton mt-0.5 h-4 w-16 rounded' />
                        ) : (
                            <p className='tabular-nums text-xs text-gray-300'>{formatPrice(ticker.l)}</p>
                        )}
                    </div>
                    <div className='leading-tight'>
                        <p className='flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500'>
                            24h Volume
                        </p>
                        {!ticker ? (
                            <div className='skeleton mt-0.5 h-4 w-16 rounded' />
                        ) : (
                            <p className='tabular-nums text-xs text-gray-300'>{formatVolume(ticker.V)}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* EQUITY */}
            {userId && (
                <div className='flex items-center gap-2'>
                    <div ref={rampRef} className='relative'>
                        <div className='flex items-center gap-1'>
                            <button
                                type="button"
                                onClick={() => setRampOpen((prev) => !prev)}
                                className='flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800/60'
                            >
                                <Plus className='h-3.5 w-3.5' />
                                Deposit
                            </button>
                            <button
                                type="button"
                                onClick={() => setRampOpen((prev) => !prev)}
                                className='flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800/60'
                            >
                                Withdraw
                                <ArrowUpRight className='h-3.5 w-3.5' />
                            </button>
                        </div>
                        {rampOpen && <RampBox />}
                    </div>
                    <BalanceBox />
                    <AvatarMenu size="sm" />
                </div>
            )}
        </div>
    )
}

export default Topbar
