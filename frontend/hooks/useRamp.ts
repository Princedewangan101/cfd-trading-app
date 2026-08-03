"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { showActionPromise } from "@/lib/toast";
import { config } from "@/lib/config";
import { isTimeoutError } from "@/lib/api";

interface RampResponse {
    success: boolean;
    transactionId?: string;
    response?: string;
    message: string;
}

const RAMP_MAX_ATTEMPTS = 2;

async function rampRequest(
    mode: "deposit" | "withdraw",
    amount: number,
    ikey: string
): Promise<RampResponse> {
    const serverResponse = await axios.post(
        `http://localhost:5000/api/${mode}`,
        { amount, ikey },
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
            showActionPromise(mode, async () => {
                const ikey = crypto.randomUUID();

                for (let attempt = 1; attempt <= RAMP_MAX_ATTEMPTS; attempt++) {
                    try {
                        return await rampRequest(mode, amount, ikey);
                    } catch (error) {
                        if (!isTimeoutError(error) || attempt === RAMP_MAX_ATTEMPTS) {
                            throw error;
                        }
                    }
                }

                throw new Error("Failed to reach server.");
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["balance"] });
        },
    });
}