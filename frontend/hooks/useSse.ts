"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/store";
import { toastSuccess } from "@/lib/toast";

interface ExecutedPayload {
    orderId: string;
    openPrice: number;
}

interface CompletedPayload {
    orderObj: {
        orderId: string;
        symbol: string;
        side: string;
    };
}

// Opens a per-user SSE connection to the backend and surfaces engine
// events (orderExecuted / orderCompleted) as toasts. EventSource reconnects
// automatically; replay uses the Last-Event-ID header on reconnect.
export function useSse() {
    const userId = useAppStore((s) => s.userId);

    useEffect(() => {
        if (!userId) return;

        const es = new EventSource("http://localhost:5000/api/events", {
            withCredentials: true,
        });

        es.addEventListener("orderExecuted", (event) => {
            const data = JSON.parse((event as MessageEvent).data) as ExecutedPayload;
            toastSuccess(`Order executed at ${data.openPrice}`);
        });

        es.addEventListener("orderCompleted", (event) => {
            const data = JSON.parse((event as MessageEvent).data) as CompletedPayload;
            const { orderId, symbol, side } = data.orderObj;
            toastSuccess(`${symbol} ${side} order completed (${orderId.slice(0, 8)})`);
        });

        es.onerror = () => {
            // EventSource reconnects automatically; nothing to do here
        };

        return () => es.close();
    }, [userId]);
}
