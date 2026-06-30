"use client";
import React from 'react'
import Image from 'next/image'
import solanalogo from "../../../asset/solanalogo.png";
import BalanceBox from './BalanceBox';

const Topbar = ({ symbol }: { symbol: string }) => {

  return (
    <div className='flex justify-between px-2 py-1  bg-zinc-950 rounded h-10'>
      {/* SYMBOL DISPLAY BOX */}
      <div className='flex justify-center items-center hover:bg-zinc-800 rounded-md w-fit px-2 gap-2 hover:cursor-default'>
        <Image src={solanalogo} alt='solana-coin-img' width={20} className='rounded-full' />
        <p className='font-bold'>{symbol.slice(0,-3)}/USD</p>
        <p>""</p>
      </div>


      {/* LIVE EQUITY DISPLAY */}
      <BalanceBox/>

      <div className='relative group font-semibold flex justify-center items-center rounded-md w-fit px-2 gap-2  hover:cursor-default'>
        POSITION ""
      </div>

    </div>
  )
}

export default Topbar