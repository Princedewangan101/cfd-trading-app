"use client";

import { useAppStore } from '@/store/store';
import { useBalance } from '@/hooks/useBalance';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'

const BalanceBox = () => {
  useBalance()
  const totalBalance = useAppStore((state) => state.totalBalance)
  const availableBalance = useAppStore((state) => state.availableBalance)
  const lockedBalance = useAppStore((state) => state.lockedBalance)
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const balanceRef = useRef<HTMLDivElement>(null)

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
        <span className='text-sm font-medium tabular-nums text-gray-200'>
          ${totalBalance.toLocaleString("en-US")}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className='absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-zinc-800 bg-zinc-900/95 px-3 py-2 text-sm shadow-2xl backdrop-blur-md'>
          <div className='flex items-center justify-between py-0.5'>
            <p className='text-gray-500'>Available</p>
            <p className='tabular-nums text-gray-200'>${availableBalance.toLocaleString("en-US")}</p>
          </div>
          <div className='flex items-center justify-between py-0.5'>
            <p className='text-gray-500'>Locked</p>
            <p className='tabular-nums text-gray-200'>${lockedBalance.toLocaleString("en-US")}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default BalanceBox
