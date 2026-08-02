"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useModifyOrder } from "@/hooks/useModifyOrder";
import type { Order } from "@/hooks/useOrders";

interface ModifyBoxProps {
    order: Order;
    onClose: () => void;
}

const ModifyBox = ({ order, onClose }: ModifyBoxProps) => {
    const [tp, setTp] = useState<string>(order.tp ? String(order.tp) : "");
    const [sl, setSl] = useState<string>(order.sl ? String(order.sl) : "");
    const modify = useModifyOrder();
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!boxRef.current) return;
        const handleClick = (event: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    function handleNumericInput(value: string) {
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            return value;
        }
        return value.slice(0, -1);
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (tp === "" && sl === "") return;
        modify.mutate(
            {
                orderId: order.orderId,
                tp: tp === "" ? undefined : Number(tp),
                sl: sl === "" ? undefined : Number(sl),
            },
            { onSuccess: onClose }
        );
    }

    const inputClass = "w-full rounded-lg bg-zinc-800/60 p-2.5 text-sm text-gray-200 placeholder:text-gray-600 outline-none transition-colors focus:bg-zinc-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

    return (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-zinc-800 bg-zinc-900/95 px-4 py-4 shadow-2xl backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-100">Modify {order.symbol}</p>
                <button type="button" onClick={onClose} className="p-0.5 text-gray-500 transition-colors hover:text-gray-200">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                    <label htmlFor={`tp-${order.orderId}`} className="mb-1 block text-xs font-medium text-gray-500">Take Profit</label>
                    <input
                        id={`tp-${order.orderId}`}
                        type="text"
                        inputMode="decimal"
                        value={tp}
                        onChange={(e) => setTp(handleNumericInput(e.target.value))}
                        placeholder="TP price"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label htmlFor={`sl-${order.orderId}`} className="mb-1 block text-xs font-medium text-gray-500">Stop Loss</label>
                    <input
                        id={`sl-${order.orderId}`}
                        type="text"
                        inputMode="decimal"
                        value={sl}
                        onChange={(e) => setSl(handleNumericInput(e.target.value))}
                        placeholder="SL price"
                        className={inputClass}
                    />
                </div>
                <button
                    type="submit"
                    disabled={modify.isPending}
                    className="flex h-9 w-full items-center justify-center rounded-lg bg-ind text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-ind-dark disabled:opacity-80"
                >
                    {modify.isPending ? (
                        <span className="flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="h-1.5 w-1.5 rounded-full bg-white animate-dotBounceY"
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                />
                            ))}
                        </span>
                    ) : (
                        "Modify"
                    )}
                </button>
            </form>
        </div>
    );
};

export default ModifyBox;
