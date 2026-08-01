"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { handleError } from "@/app/utils/errorHandler";
import { toastError, toastSuccess } from "@/lib/toast";
import { config } from "@/lib/config";

interface RampResponse {
    success: boolean;
    transactionId: string;
    message: string;
}

async function rampRequest(
    mode: "deposit" | "withdraw",
    amount: number
): Promise<RampResponse> {
    const serverResponse = await axios.post(
        `http://localhost:5000/api/${mode}`,
        { amount, ikey: crypto.randomUUID() },
        config
    );

    if (!serverResponse.data?.success) {
        throw new Error(serverResponse.data?.message ?? "No response from server");
    }

    return serverResponse.data;
}

export function useRamp() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ mode, amount }: { mode: "deposit" | "withdraw"; amount: number }) =>
            rampRequest(mode, amount),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["balance"] });
            toastSuccess(data.message);
        },
        onError: (error) => {
            toastError(handleError(error));
        },
    });
}
