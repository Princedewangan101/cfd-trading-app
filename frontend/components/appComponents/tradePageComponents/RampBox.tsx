"use client";

import React from "react";
import { useRamp } from "@/hooks/useRamp";

const RampBox = () => {
    const [mode, setMode] = React.useState<"deposit" | "withdraw">("deposit");
    const [amount, setAmount] = React.useState<string>("");
    const ramp = useRamp();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (Number(amount) <= 0) return;
        ramp.mutate({ mode, amount: Number(amount) });
    }

    return (
        <div className='absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900/90 px-4 py-4 shadow-2xl backdrop-blur-md'>
            <div className="flex w-full gap-1 rounded-lg bg-zinc-800/60 p-1">
                <button
                    type="button"
                    onClick={() => setMode("deposit")}
                    className={`flex-1 rounded-md p-1.5 text-xs font-medium transition-colors ${mode === "deposit" ? "bg-zinc-700 text-gray-100" : "text-gray-400 hover:text-gray-200"}`}
                >
                    Deposit
                </button>
                <button
                    type="button"
                    onClick={() => setMode("withdraw")}
                    className={`flex-1 rounded-md p-1.5 text-xs font-medium transition-colors ${mode === "withdraw" ? "bg-zinc-700 text-gray-100" : "text-gray-400 hover:text-gray-200"}`}
                >
                    Withdraw
                </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
                <input
                    required
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full rounded-lg bg-zinc-800/60 p-2.5 text-sm text-gray-200 placeholder:text-gray-600 outline-none transition-colors focus:bg-zinc-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                    type="submit"
                    disabled={ramp.isPending}
                    className={`w-full rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors disabled:opacity-50 ${mode === "deposit" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}
                >
                    {mode === "deposit" ? "Deposit" : "Withdraw"}
                </button>
            </form>
        </div>
    );
};

export default RampBox;
