import { create } from 'zustand'

interface MarketStoreStateType {
    prices: Record<string, number>
    setPrice: (base: string, price: number) => void
}

export const useMarketStore = create<MarketStoreStateType>()(
    (set) => ({
        prices: {},
        setPrice: (base: string, price: number) =>
            set((state) => ({ prices: { ...state.prices, [base]: price } })),
    })
)
