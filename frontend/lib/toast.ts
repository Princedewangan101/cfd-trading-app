import toast, { type ToastOptions } from "react-hot-toast";
import { handleError } from "@/app/utils/errorHandler";

const actionMessages = {
    market: { loading: "Placing market order…", success: "Market order executed" },
    limit: { loading: "Placing limit order…", success: "Limit order placed" },
    close: { loading: "Closing position…", success: "Position closed" },
    cancel: { loading: "Cancelling order…", success: "Order cancelled" },
    deposit: { loading: "Processing deposit…", success: "Deposit successful" },
    withdraw: { loading: "Processing withdrawal…", success: "Withdrawal successful" },
};

export type ToastAction = keyof typeof actionMessages;

const promiseToastOptions: ToastOptions = {
    duration: 4000,
    iconTheme: { primary: "#4f46e5", secondary: "#09090b" },
    style: {
        background: "rgba(39, 39, 42, 0.95)",
        color: "#f4f4f5",
        borderRadius: "12px",
        fontSize: "14px",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        padding: "10px 14px",
    },
};

export const showActionPromise = (
    action: ToastAction,
    requestFn: () => Promise<unknown>
) =>
    toast.promise(
        requestFn,
        {
            loading: actionMessages[action].loading,
            success: actionMessages[action].success,
            error: (error) => handleError(error),
        },
        promiseToastOptions
    );

export const toastError = (message: string) =>
    toast.error(message, promiseToastOptions);

export const toastSuccess = (message: string) =>
    toast.success(message, promiseToastOptions);
