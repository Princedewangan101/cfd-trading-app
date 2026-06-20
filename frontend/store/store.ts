import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStoreStateType {
    timeFrame: string,
    symbol: string,
    userId: string,
    userName: string,
    totalBalance: number,
    availableBalance: number,
    lockedBalance: number,
    setUserId: (userIdFromServer: string) => void
    setUserName: (userNameFromServer: string) => void
    setBalance: (balance: number) => void
}

export const useAppStore = create<AppStoreStateType>()(
    persist(
        (set, get) => ({
            timeFrame: "",
            userId: "",
            userName: "",
            totalBalance: 0,
            availableBalance: 0,
            lockedBalance: 0,
            symbol: "",
            setUserId: (userIdFromServer: string) => set({ userId: userIdFromServer }),
            setUserName: (userNameFromServer: string) => set({ userName: userNameFromServer }),
            setBalance: (balance: number) => set({ totalBalance: balance })
            // increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
        }),
        {
            name: "tradingAppStorage"
        }
    )
)
