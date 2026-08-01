"use client";

import React from 'react'
import { position } from '@/lib/timeFrames'

const DrawerHeader = () => {
    const [dropupOpen, setDropupOpen] = React.useState<boolean>(false);
    const [isDrawerOpen, setisDrawerOpen] = React.useState<boolean>(false);

    const openCount = position.filter((p) => p.status === "EXECUTED").length;
    const closeCount = position.filter((p) => p.closeTime !== "-").length;
    const pendingCount = position.filter((p) => p.status === "PENDING").length;

    return (
        <div className=" flex justify-between items-center bg-zinc-s rounded mt-1 py-1 px-2">
            <div className="flex items-center gap-2">
                <button className="flex w-20 items-center justify-center gap-1.5 rounded-md p-2 text-sm hover:bg-zinc-800">
                    OPEN
                    <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">{openCount}</span>
                </button>
                <button className="flex w-20 items-center justify-center gap-1.5 rounded-md p-2 text-sm hover:bg-zinc-800">
                    CLOSE
                    <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">{closeCount}</span>
                </button>
                <button className="flex w-20 items-center justify-center gap-1.5 rounded-md p-2 text-sm hover:bg-zinc-800">
                    PENDING
                    <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">{pendingCount}</span>
                </button>
            </div>
            <div className="flex items-center">
                <button
                    onClick={() => setDropupOpen(!dropupOpen)}
                    className="relative w-25 text-sm p-2 hover:bg-zinc-800 rounded-md">
                    Close
                    <div className={`${dropupOpen ? "block" : "hidden"} absolute bottom-10 right-0 border border-white h-100 w-100`}>

                    </div>
                </button>
                <button
                    onClick={() => setisDrawerOpen(!isDrawerOpen)}
                    className={`${isDrawerOpen ? "rotate-180" : "rotate-0"} text-sm p-1 hover:bg-zinc-800 rounded-md`}>
                    <svg width="25" height="25" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </button>
            </div>
        </div>
    )
}

export default DrawerHeader
