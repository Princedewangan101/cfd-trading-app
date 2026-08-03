"use client";

import React, { useState } from "react";
import { Pencil, X } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useCloseOrder } from "@/hooks/useCloseOrder";
import { usePositionStore } from "@/store/positionStore";
import { useMarketStore } from "@/store/marketStore";
import { baseOf, computePnl } from "@/lib/pnl";
import ModifyBox from "./ModifyBox";
import { useAppStore } from "@/store/store";

const formatPrice = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return "-";
    return "$" + Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatQty = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return "-";
    return Number(value).toLocaleString("en-US", {
        maximumFractionDigits: 2,
    });
};

const formatPnl = (value: string | number | null | undefined) => {
    const pnl = value === null || value === undefined || value === "" || Number.isNaN(Number(value)) ? null : Number(value);
    if (pnl === null) return "-";
    const sign = pnl > 0 ? "+" : "";
    return `${sign}$${pnl.toFixed(2)}`;
};

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
    }).format(date).toUpperCase();
};

const SkeletonRow = () => (
    <tr className="border-b border-zinc-900 last:border-b-0">
        <td className="py-3 pl-1 pr-3"><div className="skeleton h-4 w-16 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-8 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-10 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-10 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-14 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-14 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-12 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-12 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-12 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-12 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-16 rounded" /></td>
        <td className="py-3 pl-3 pr-1 text-right"><div className="skeleton ml-auto h-4 w-14 rounded" /></td>
    </tr>
);

const statusClass = () => "text-gray-400";

const PositionsTable = () => {
    const { data: orders = [], isLoading } = useOrders();
    const filter = usePositionStore((state) => state.filter);
    const closeOrder = useCloseOrder();
    const prices = useMarketStore((state) => state.prices);
    const userId = useAppStore((state) => state.userId);
    const [modifyOrderId, setModifyOrderId] = useState<string | null>(null);

    const filteredOrders = orders.filter((order) => {
        switch (filter) {
            case "open": return order.status === "RUNNING";
            case "close": return order.status === "COMPLETED" || order.status === "CLOSED";
            case "pending": return order.status === "PENDING";
            default: return true;
        }
    });

    const empty = !isLoading && filteredOrders.length === 0;

    return (
        <div className="flex flex-col rounded bg-zinc-950">
            {/* TABLE */}
            <div className="px-2 pb-2">
                <table className="w-full text-xs">
                    <thead className="bg-zinc-950">
                        <tr className="border-b border-zinc-900 text-xs uppercase tracking-wider text-gray-500">
                            <th className="py-2 pl-1 pr-3 text-left font-medium">Symbol</th>
                            <th className="px-3 py-2 text-left font-medium">Side</th>
                            <th className="px-3 py-2 text-left font-medium">Qty</th>
                            <th className="px-3 py-2 text-left font-medium">Leverage</th>
                            <th className="px-3 py-2 text-left font-medium">Open</th>
                            <th className="px-3 py-2 text-left font-medium">Close</th>
                            <th className="px-3 py-2 text-left font-medium">PnL</th>
                            <th className="px-3 py-2 text-left font-medium">TP</th>
                            <th className="px-3 py-2 text-left font-medium">SL</th>
                            <th className="px-3 py-2 text-left font-medium">Status</th>
                            <th className="px-3 py-2 text-left font-medium">AT</th>
                            <th className="py-2 pl-3 pr-1 text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)
                            : empty
                                ? (
                                    <tr className="border-b border-zinc-900 last:border-b-0">
                                        <td colSpan={12} className="py-2 pl-1 pr-3">
                                            <div className="flex h-48 items-center justify-center">
                                                <p className="text-sm text-gray-500">{userId ? "No order yet." : "login or signup"}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )
                                : filteredOrders.map((order) => {
                                    const isRunning = order.status === "RUNNING";
                                    const isPending = order.status === "PENDING";
                                    const livePrice = prices[baseOf(order.symbol)] ?? null;
                                    const priceSource = isRunning
                                        ? livePrice
                                        : order.closePrice !== null && order.closePrice !== undefined && order.closePrice !== ""
                                            ? Number(order.closePrice)
                                            : livePrice;
                                    const pnl = isPending ? null : computePnl(order, priceSource) ?? (order.pnl === null || order.pnl === undefined || order.pnl === "" ? null : Number(order.pnl));
                                    const pnlClass = pnl === null
                                        ? "text-gray-500"
                                        : pnl > 0
                                            ? "text-emerald-500/70"
                                            : pnl < 0
                                                ? "text-red-500/70"
                                                : "text-gray-500";
                                    return (
                                        <tr key={order.orderId} className="border-b border-zinc-900 transition-colors last:border-b-0 hover:bg-zinc-900/40">
                                            <td className="py-2 pl-1 pr-3 font-medium text-gray-400">{order.symbol}</td>
                                            <td className="px-3 py-2 text-gray-400">{order.side}</td>
                                            <td className="px-3 py-2 tabular-nums text-gray-400">{formatQty(order.quantity)}</td>
                                            <td className="px-3 py-2 tabular-nums text-gray-400">{order.leverage}x</td>
                                            <td className="px-3 py-2 tabular-nums text-gray-400">{formatPrice(order.openPrice)}</td>
                                            <td className="px-3 py-2 tabular-nums text-gray-400">{formatPrice(order.closePrice)}</td>
                                            <td className={`px-3 py-2 tabular-nums ${pnlClass}`}>{formatPnl(pnl)}</td>
                                            <td className="px-3 py-2 tabular-nums text-gray-400">{formatPrice(order.tp)}</td>
                                            <td className="px-3 py-2 tabular-nums text-gray-400">{formatPrice(order.sl)}</td>
                                            <td className={`px-3 py-2 ${statusClass()}`}>{order.status}</td>
                                            <td className="px-3 py-2 tabular-nums text-gray-400">{formatDate(order.createdAt)}</td>
                                            <td className="py-2 pl-3 pr-1 text-right">
                                                {isRunning && (
                                                    <div className="relative flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setModifyOrderId(order.orderId)}
                                                            className="p-1 text-gray-500 transition-colors hover:text-white"
                                                            aria-label="Modify order"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={closeOrder.isPending}
                                                            onClick={() => closeOrder.mutate({ orderId: order.orderId })}
                                                            className="p-1 text-gray-500 transition-colors hover:text-white"
                                                            aria-label="Close order"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                        {modifyOrderId === order.orderId && (
                                                            <ModifyBox order={order} onClose={() => setModifyOrderId(null)} />
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PositionsTable;
