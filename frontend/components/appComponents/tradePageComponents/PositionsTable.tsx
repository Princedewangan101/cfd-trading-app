"use client";

import React from "react";
import { position } from "@/lib/timeFrames";

const SkeletonRow = () => (
    <tr className="border-b border-zinc-900 last:border-b-0">
        <td className="py-3 pl-1 pr-3"><div className="skeleton h-4 w-16 rounded" /></td>
        <td className="px-3 py-3"><div className="skeleton h-4 w-8 rounded" /></td>
        <td className="px-3 py-3 text-right"><div className="skeleton ml-auto h-4 w-12 rounded" /></td>
        <td className="px-3 py-3 text-right"><div className="skeleton ml-auto h-4 w-14 rounded" /></td>
        <td className="px-3 py-3 text-right"><div className="skeleton ml-auto h-4 w-14 rounded" /></td>
        <td className="px-3 py-3 text-right"><div className="skeleton ml-auto h-4 w-10 rounded" /></td>
        <td className="px-3 py-3 text-right"><div className="skeleton ml-auto h-4 w-10 rounded" /></td>
        <td className="px-3 py-3 text-right"><div className="skeleton ml-auto h-4 w-12 rounded" /></td>
        <td className="py-3 pl-3 pr-1 text-right"><div className="skeleton ml-auto h-4 w-14 rounded" /></td>
    </tr>
);

const PositionsTable = () => {
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    const pendingCloseOrders = position.filter((p) => p.closeTime === "-" && p.status !== "CANCELLED");

    return (
        <div className="flex flex-col rounded bg-zinc-950">
            {/* TABLE */}
            <div className="px-2 pb-2">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-950">
                        <tr className="border-b border-zinc-900 text-xs uppercase tracking-wider text-gray-500">
                            <th className="py-2 pl-1 pr-3 text-left font-medium">Market</th>
                            <th className="px-3 py-2 text-left font-medium">Side</th>
                            <th className="px-3 py-2 text-right font-medium">Size</th>
                            <th className="px-3 py-2 text-right font-medium">Open</th>
                            <th className="px-3 py-2 text-right font-medium">Mark</th>
                            <th className="px-3 py-2 text-right font-medium">SL</th>
                            <th className="px-3 py-2 text-right font-medium">TP</th>
                            <th className="px-3 py-2 text-right font-medium">PnL</th>
                            <th className="py-2 pl-3 pr-1 text-right font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)
                            : pendingCloseOrders.map((p) => (
                                <tr key={p.id} className="border-b border-zinc-900 transition-colors last:border-b-0 hover:bg-zinc-900/40">
                                    <td className="py-2 pl-1 pr-3 font-medium text-gray-400">{p.symbol}</td>
                                    <td className={`px-3 py-2 ${p.side === "BUY" ? "text-emerald-500" : "text-red-500"}`}>
                                        {p.side}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-gray-400">{p.quantity}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-gray-400">{p.op}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-gray-400">{p.cp === "-" ? "—" : p.cp}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-gray-400">{p.sl}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-gray-400">{p.tp}</td>
                                    <td className={`px-3 py-2 text-right tabular-nums ${p.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {p.pnl}
                                    </td>
                                    <td className="py-2 pl-3 pr-1 text-right text-gray-400">{p.status}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PositionsTable;
