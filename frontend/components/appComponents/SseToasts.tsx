"use client";

import { useSse } from "@/hooks/useSse";

// Client bridge that mounts the SSE listener inside the root Providers tree,
// so toasts work on every logged-in page (trade, market, position, account...).
export default function SseToasts() {
    useSse();
    return null;
}
