"use client";

import { useAppStore } from '@/store/store';
import React from 'react'

const BalanceBox = () => {
  const userId = useAppStore((state) => state.userId)
  const totalBalance = useAppStore((state) => state.totalBalance)
  const availableBalance = useAppStore((state) => state.availableBalance)
  const lockedBalance = useAppStore((state) => state.lockedBalance)

  // console.log(`\n\ntotalBal : ${totalBalance}\navailableBal: ${availableBalance}\nlockedBal : ${lockedBalance}`);

  React.useEffect(() => {
    // fetchBalance()
  }, [userId]);


  return (
    <div className='relative group flex justify-center items-center rounded-md w-fit px-2 gap-2  hover:cursor-default'>
      <p>{totalBalance}</p>
      <div className='z-40 group-hover:block hidden text-sm absolute top-10 w-50 px-2 py-1 rounded-md bg-zinc-900 boxShadow'>
        <div className='flex'>
          <p className='w-25  text-start'>available bal:</p>
          <p className='w-25  text-end'>{availableBalance}</p>
        </div>
        <div className='flex'>
          <p className='w-25  text-start'>locked bal:</p>
          <p className='w-25  text-end'>{lockedBalance}</p>
        </div>
      </div>
    </div>
  )
}

export default BalanceBox