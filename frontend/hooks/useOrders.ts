"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect } from "react";
import { handleError } from "@/app/utils/errorHandler";
import { toastError } from "@/lib/toast";
import { config } from "@/lib/config";
import { BACKEND_URL } from "@/lib/url";

export interface Order {
    orderId: string;
    userId: string;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: string | number | null;
    leverage: number;
    openPrice: string | number | null;
    closePrice: string | number | null;
    pnl: string | number | null;
    tp: string | number | null;
    sl: string | number | null;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "CLOSED";
    createdAt: string;
}

async function fetchOrders(): Promise<Order[]> {
    const serverResponse = await axios.get(BACKEND_URL.orders, config);

    if (!serverResponse.data?.success) {
        throw new Error(serverResponse.data?.message ?? "No response from server");
    }

    return serverResponse.data.data;
}

export function useOrders() {
    const query = useQuery({
        queryKey: ["orders"],
        queryFn: fetchOrders,
        retry: false,
    });

    useEffect(() => {
        if (query.isError) {
            toastError(handleError(query.error));
        }
    }, [query.isError, query.error]);

    return query;
}
