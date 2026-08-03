"use client";

import { useAppStore } from '@/store/store';
import { useBalance } from '@/hooks/useBalance';
import { useOrders } from '@/hooks/useOrders';
import { useMarketStore } from '@/store/marketStore';
import { baseOf, computePnl } from '@/lib/pnl';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'

const formatUsd = (value: number) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BalanceBox = () => {
  const { isPending, isError } = useBalance()
  const totalBalance = useAppStore((state) => state.totalBalance)
  const { data: orders = [] } = useOrders()
  const prices = useMarketStore((state) => state.prices)
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const balanceRef = useRef<HTMLDivElement>(null)

  const totalPnl = orders.reduce((sum, order) => {
    if (order.status !== "RUNNING") return sum;
    const livePrice = prices[baseOf(order.symbol)] ?? null;
    const pnl = computePnl(order, livePrice);
    return sum + (pnl === null ? 0 : pnl);
  }, 0);

  const equity = totalBalance + totalPnl;
  const pnlClass = totalPnl > 0
    ? "text-emerald-500/70"
    : totalPnl < 0
      ? "text-red-500/70"
      : "text-gray-200";

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (event: MouseEvent) => {
      if (balanceRef.current && !balanceRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [dropdownOpen])

  return (
    <div ref={balanceRef} className='relative'>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className='flex items-center gap-1 rounded-md px-2 py-1 transition-colors'
      >
        {isPending || isError ? (
          <div className='skeleton h-5 w-24 rounded' />
        ) : (
          <span className='text-sm font-medium tabular-nums text-gray-200'>
            {formatUsd(equity)}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className='absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-zinc-800 bg-zinc-900/95 px-3 py-2 text-sm shadow-2xl backdrop-blur-md'>
          <div className='flex items-center justify-between py-0.5'>
            <p className='text-gray-500'>Balance</p>
            <p className='tabular-nums text-gray-200'>{formatUsd(totalBalance)}</p>
          </div>
          <div className='flex items-center justify-between py-0.5'>
            <p className='text-gray-500'>PnL</p>
            <p className={`tabular-nums ${pnlClass}`}>{totalPnl >= 0 ? "+" : ""}{formatUsd(totalPnl)}</p>
          </div>
          <div className='flex items-center justify-between py-0.5'>
            <p className='text-gray-500'>Equity</p>
            <p className='tabular-nums text-gray-200'>{formatUsd(equity)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default BalanceBox
