"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import "@/lib/api";
import SseToasts from "@/components/appComponents/SseToasts";

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <SseToasts />
        </QueryClientProvider>
    );
}
