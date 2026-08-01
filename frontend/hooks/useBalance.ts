"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect } from "react";
import { handleError } from "@/app/utils/errorHandler";
import { toastError } from "@/lib/toast";
import { config } from "@/lib/config";
import { useAppStore } from "@/store/store";

interface BalanceResponse {
    balance: number;
}

async function fetchBalance(): Promise<BalanceResponse> {
    const serverResponse = await axios.get(
        `http://localhost:5000/api/balance`,
        config
    );

    if (!serverResponse.data?.success) {
        throw new Error(serverResponse.data?.message ?? "No response from server");
    }

    return {
        balance: Number(serverResponse.data.balance),
    };
}

export function useBalance() {
    const setBalance = useAppStore((state) => state.setBalance);

    const query = useQuery({
        queryKey: ["balance"],
        queryFn: fetchBalance,
        retry: false,
    });

    useEffect(() => {
        if (query.data) {
            setBalance(query.data.balance);
        }
    }, [query.data, setBalance]);

    useEffect(() => {
        if (query.isError) {
            toastError(handleError(query.error));
        }
    }, [query.isError, query.error]);

    return query;
}
