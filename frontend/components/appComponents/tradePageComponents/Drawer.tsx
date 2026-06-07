"use client";
import { drawerPostionHeader, position, positionHeader } from '@/lib/timeFrames';
import React from 'react'

const Drawer = () => {
  function handleDrawerOpenClose() {

  }

  return (
    // <div onClick={handleDrawerOpenClose} className='bg-zinc-950 rounded w-full h-10'>

    <div onClick={handleDrawerOpenClose} className='hidden bg-zinc-950 border border-white overflow-y-hidden px-3 z-20 rounded w-full h-100 absolute top-0'>
      {/* HEADER */}
      <div className='text-xs px-2 w-fit flex ml-auto'>
        close
      </div>

      <div className='flex ml-7 justify-around w-2/5 mb-1'>
        {drawerPostionHeader.map((positionTitle) => (
          <div key={positionTitle} className='w-20 text-center text-gray-300 hover:text-gray-100 hover:cursor-default'>
            {positionTitle}
          </div>
        ))}
      </div>
      <div className='border flex '>
        {
          positionHeader.map((title) => (
            <div key={title} className='border w-30'>
              {title}
            </div>
          ))
        }
      </div>


      {
        position.map(({ symbol, quantity, side, op, cp, closeTime, sl, tp, pnl, executionTime, status }, idx) => (
          <div key={idx} className='border flex '>
            <div className='border w-30 text-xs text-gray-300 '>{symbol}</div>
            <div className='border w-30 text-xs text-gray-300 '>{quantity}</div>
            <div className='border w-30 text-xs text-gray-300 '>{side}</div>
            <div className='border w-30 text-xs text-gray-300 '>{op}</div>
            <div className='border w-30 text-xs text-gray-300 '>{cp}</div>
            <div className='border w-30 text-xs text-gray-300 '>{closeTime}</div>
            <div className='border w-30 text-xs text-gray-300 '>{sl}</div>
            <div className='border w-30 text-xs text-gray-300 '>{tp}</div>
            <div className='border w-30 text-xs text-gray-300 '>{pnl}</div>
            <div className='border w-30 text-xs text-gray-300 '>{executionTime}</div>
            <div className='border w-30 text-xs text-gray-300 '>{status}</div>
          </div>
        ))
      }


    </div>

  )
}

export default Drawer