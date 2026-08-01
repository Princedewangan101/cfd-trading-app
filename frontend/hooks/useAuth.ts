"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { handleError } from "@/app/utils/errorHandler";
import { toastError } from "@/lib/toast";
import { config } from "@/lib/config";
import { useAppStore } from "@/store/store";

interface AuthResponse {
    userId: string;
    userName: string;
}

async function authenticate(
    formData: FormData,
    authPage: "signin" | "signup"
): Promise<AuthResponse> {
    const payload = Object.fromEntries(formData.entries());

    const serverResponse = await axios.post(
        `http://localhost:5000/api/${authPage}`,
        payload,
        config
    );

    if (!serverResponse.data?.success) {
        throw new Error(serverResponse.data?.message ?? "No response from server");
    }

    return {
        userId: serverResponse.data.data.userId,
        userName: serverResponse.data.data.userName,
    };
}

export function useAuth() {
    const router = useRouter();

    return useMutation({
        mutationFn: ({ formData, mode }: { formData: FormData; mode: "signin" | "signup" }) =>
            authenticate(formData, mode),
        onSuccess: (data) => {
            useAppStore.getState().setUserId(data.userId);
            useAppStore.getState().setUserName(data.userName);
            router.push("/");
        },
        onError: (error) => {
            toastError(handleError(error));
        },
    });
}
