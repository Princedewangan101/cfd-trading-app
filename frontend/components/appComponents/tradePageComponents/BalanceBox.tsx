"use client";

import { handleError } from '@/app/utils/errorHandler';
import { config } from '@/lib/config';
import { toastConfig } from '@/lib/toastConfig';
import { useAppStore } from '@/store/store';
import axios from 'axios';
import React from 'react'
import { toast } from 'react-toastify';

const BalanceBox = () => {
  const userId = useAppStore((state) => state.userId)
  const totalBalance = useAppStore((state) => state.totalBalance)
  const availableBalance = useAppStore((state) => state.availableBalance)
  const lockedBalance = useAppStore((state) => state.lockedBalance)

  console.log(`\n\ntotalBal : ${totalBalance}\n availableBal: ${availableBalance}\n lockedBal : ${lockedBalance}`);


  async function fetchBalance() {
    try {

      const serverResponse = await axios.get(`http://localhost:5000/api/balance`, config)
      console.log("\n\nserverResponse.data (/api/balance) : ", serverResponse.data);

      useAppStore.setState({
        totalBalance: serverResponse.data.totalBalance,
        availableBalance: serverResponse.data.availableBalance,
        lockedBalance: serverResponse.data.lockedBalance,
      })

    } catch (error: any) {
      const errorMessage = handleError(error);
      toast(errorMessage, toastConfig)
    }
  }

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