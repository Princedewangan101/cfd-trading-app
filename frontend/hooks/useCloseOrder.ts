"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { showActionPromise } from "@/lib/toast";
import { config } from "@/lib/config";

interface CloseResponse {
    success: boolean;
    data: {
        success: boolean;
        data: {
            orderId: string;
            status: string;
            closePrice: string;
            message: string;
        };
    };
}

async function closeRequest(orderId: string): Promise<CloseResponse> {
    const serverResponse = await axios.post(
        `http://localhost:5000/api/close`,
        { orderId, ikey: crypto.randomUUID() },
        config
    );

    if (!serverResponse.data?.success) {
        throw new Error(serverResponse.data?.message ?? "No response from server");
    }

    return serverResponse.data;
}

export function useCloseOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId }: { orderId: string }) =>
            showActionPromise("close", () => closeRequest(orderId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["balance"] });
        },
    });
}
