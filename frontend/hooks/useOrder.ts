"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { showActionPromise } from "@/lib/toast";
import { config } from "@/lib/config";
import { BACKEND_URL } from "@/lib/url";
import { isTimeoutError } from "@/lib/api";

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
    payload: OrderPayload,
    ikey: string
): Promise<OrderResponse> {
    const url = orderType === "market" ? BACKEND_URL.tradeMarket : BACKEND_URL.tradeLimit;

    const serverResponse = await axios.post(
        url,
        { ...payload, ikey },
        config
    );

    if (!serverResponse.data?.success) {
        throw new Error(serverResponse.data?.message ?? "No response from server");
    }

    return serverResponse.data;
}

const ORDER_MAX_ATTEMPTS = 2;

export function useOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderType, payload }: { orderType: "market" | "limit"; payload: OrderPayload }) =>
            showActionPromise(orderType, async () => {
                const ikey = crypto.randomUUID();

                for (let attempt = 1; attempt <= ORDER_MAX_ATTEMPTS; attempt++) {
                    try {
                        return await placeOrder(orderType, payload, ikey);
                    } catch (error) {
                        if (!isTimeoutError(error) || attempt === ORDER_MAX_ATTEMPTS) {
                            throw error;
                        }
                    }
                }

                throw new Error("Failed to reach server.");
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["balance"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}
