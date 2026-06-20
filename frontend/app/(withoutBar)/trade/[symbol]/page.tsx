import Charts from '@/components/appComponents/tradePageComponents/Charts'
import Drawer from '@/components/appComponents/tradePageComponents/Drawer'
import OrderPanel from '@/components/appComponents/tradePageComponents/OrderPanel'
import Topbar from '@/components/appComponents/tradePageComponents/Topbar'
import { useAppStore } from '@/store/store'
import React from 'react'

export interface Params {
    params: Promise<{ symbol: string }>
}

const TradePage = async ({ params }: Params) => {
    const paramObj = await params

    useAppStore.setState({
        symbol: paramObj.symbol
    })

    return (
        <div className='flex flex-col gap-1 p-1 h-screen overflow-hidden bg-black'>
            <div className='flex gap-1 h-full'>
                <div className='relative flex flex-col gap-1 rounded w-full h-full'>
                    <Topbar symbol={paramObj.symbol} />
                    <Charts symbol={paramObj.symbol}/>
                    <Drawer />
                </div>
                <OrderPanel symbol={paramObj.symbol} />
            </div>
        </div>
    )
}

export default TradePage