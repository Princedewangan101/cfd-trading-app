"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { showActionPromise } from "@/lib/toast";
import { config } from "@/lib/config";

interface ModifyResponse {
    success: boolean;
    data: {
        orderId: string;
        tp: string | number | null;
        sl: string | number | null;
    };
}

export interface ModifyPayload {
    orderId: string;
    tp?: number;
    sl?: number;
}

async function modifyRequest(payload: ModifyPayload): Promise<ModifyResponse> {
    const serverResponse = await axios.post(
        `http://localhost:5000/api/modify`,
        { ...payload, ikey: crypto.randomUUID() },
        config
    );

    if (!serverResponse.data?.success) {
        throw new Error(serverResponse.data?.message ?? "No response from server");
    }

    return serverResponse.data;
}

export function useModifyOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ModifyPayload) =>
            showActionPromise("modify", () => modifyRequest(payload)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}
