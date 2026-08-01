"use client";

import React from 'react'
import { XCircle } from 'lucide-react'
import { position } from '@/lib/timeFrames'
import axios from 'axios'
import { BACKEND_URL } from '@/lib/url'
import { config } from '@/lib/config'
import { showActionPromise } from '@/lib/toast'

const DrawerHeader = () => {
    const openCount = position.filter((p) => p.status === "EXECUTED").length;
    const closeCount = position.filter((p) => p.closeTime !== "-").length;
    const pendingCount = position.filter((p) => p.status === "PENDING").length;

    function handleCloseAll() {
        showActionPromise("closeAll", () => axios.post(BACKEND_URL.closeAll, {}, config));
    }

    return (
        <div className=" flex justify-between items-center bg-zinc-s rounded mt-1 py-1 px-2">
            <div className="flex items-center gap-2">
                <button className="flex min-w-20 items-center justify-center gap-1.5 rounded-md p-2 text-sm hover:bg-zinc-800">
                    OPEN
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">{openCount}</span>
                </button>
                <button className="flex min-w-20 items-center justify-center gap-1.5 rounded-md p-2 text-sm hover:bg-zinc-800">
                    CLOSE
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">{closeCount}</span>
                </button>
                <button className="flex min-w-20 items-center justify-center gap-1.5 rounded-md p-2 text-sm hover:bg-zinc-800">
                    PENDING
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">{pendingCount}</span>
                </button>
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
