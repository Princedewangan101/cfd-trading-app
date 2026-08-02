"use client";

import React from 'react'
import { XCircle } from 'lucide-react'
import axios from 'axios'
import { BACKEND_URL } from '@/lib/url'
import { config } from '@/lib/config'
import { showActionPromise } from '@/lib/toast'
import { useOrders } from '@/hooks/useOrders'
import { usePositionStore, type PositionFilter } from '@/store/positionStore'

const TABS: { key: PositionFilter; label: string }[] = [
    { key: "all", label: "ALL" },
    { key: "open", label: "OPEN" },
    { key: "close", label: "CLOSE" },
    { key: "pending", label: "PENDING" },
];

const DrawerHeader = () => {
    const { data: orders = [] } = useOrders();
    const filter = usePositionStore((state) => state.filter);
    const setFilter = usePositionStore((state) => state.setFilter);

    const counts: Record<PositionFilter, number> = {
        all: orders.length,
        open: orders.filter((o) => o.status === "RUNNING").length,
        close: orders.filter((o) => o.status === "COMPLETED" || o.status === "CLOSED").length,
        pending: orders.filter((o) => o.status === "PENDING").length,
    };

    function handleCloseAll() {
        showActionPromise("closeAll", () => axios.post(BACKEND_URL.closeAll, {}, config));
    }

    return (
        <div className="flex justify-between items-center bg-zinc-s rounded mt-1 py-1 px-2">
            <div className="flex items-center gap-2">
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        className={`flex min-w-20 items-center justify-center gap-1.5 rounded-md p-2 text-sm transition-colors ${filter === key ? "bg-zinc-800 text-gray-100" : "text-gray-400 hover:bg-zinc-800/60 hover:text-gray-200"}`}
                    >
                        {label}
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">{counts[key]}</span>
                    </button>
                ))}
            </div>
            <button
                onClick={handleCloseAll}
                className="flex items-center gap-1.5 rounded-md p-2 text-sm hover:bg-zinc-800">
                <XCircle className="h-4 w-4" />
                Close all
            </button>
        </div>
    )
}

export default DrawerHeader
