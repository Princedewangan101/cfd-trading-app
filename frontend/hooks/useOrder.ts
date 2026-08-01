"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { showActionPromise } from "@/lib/toast";
import { config } from "@/lib/config";
import { BACKEND_URL } from "@/lib/url";

interface OrderResponse {
    success: boolean;
    data: {
        orderId: string;
        price: number;
        status: string;
        createdAt: string;
    };
}

interface OrderPayload {
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    leverage: number;
    price?: number;
}

async function placeOrder(
    orderType: "market" | "limit",
    payload: OrderPayload
): Promise<OrderResponse> {
    const url = orderType === "market" ? BACKEND_URL.tradeMarket : BACKEND_URL.tradeLimit;

    const serverResponse = await axios.post(
        url,
        { ...payload, ikey: crypto.randomUUID() },
        config
    );

    if (!serverResponse.data?.success) {
        throw new Error(serverResponse.data?.message ?? "No response from server");
    }

    return serverResponse.data;
}

export function useOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderType, payload }: { orderType: "market" | "limit"; payload: OrderPayload }) =>
            showActionPromise(orderType, () => placeOrder(orderType, payload)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["balance"] });
        },
    });
}
