import Charts from '@/components/appComponents/tradePageComponents/Charts'
import OrderPanel from '@/components/appComponents/tradePageComponents/OrderPanel'
import PositionsTable from '@/components/appComponents/tradePageComponents/PositionsTable'
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
                <div className='relative flex w-full min-h-0 flex-col gap-1 overflow-y-auto rounded'>
                    <Topbar symbol={paramObj.symbol} />
                    <Charts symbol={paramObj.symbol} />
                    <PositionsTable />
                </div>
                <OrderPanel symbol={paramObj.symbol} />
            </div>
        </div>
    )
}

export default TradePage