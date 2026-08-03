import axios from "axios";
import { useAppStore } from "@/store/store";

const AUTH_ROUTES = ["/signin", "/signup"];

function redirectToAuth() {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/auth")) return;
    window.location.assign("/auth");
}

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            const url = error.config?.url ?? "";
            const isAuthRoute = AUTH_ROUTES.some((route) => url.includes(route));
            if (!isAuthRoute) {
                useAppStore.setState({ userId: "", userName: "" });
                redirectToAuth();
            }
        }
        return Promise.reject(error);
    }
);

export const isTimeoutError = (error: unknown): boolean =>
    axios.isAxiosError(error) && error.code === "ECONNABORTED";