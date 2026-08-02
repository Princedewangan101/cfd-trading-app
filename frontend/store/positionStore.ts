import { create } from 'zustand'

export type PositionFilter = "all" | "open" | "close" | "pending";

interface PositionStoreStateType {
    filter: PositionFilter,
    setFilter: (filter: PositionFilter) => void
}

export const usePositionStore = create<PositionStoreStateType>()(
    (set) => ({
        filter: "all",
        setFilter: (filter: PositionFilter) => set({ filter }),
    })
)
