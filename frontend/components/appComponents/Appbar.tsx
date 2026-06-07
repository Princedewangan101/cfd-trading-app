"use client";
import React from 'react'
import { Button } from '../ui/button'
import { useAppStore } from '@/store/store'
import Link from 'next/link'

const Appbar = () => {
    const userId = useAppStore((state) => state.userId)
    const userName = useAppStore((state) => state.userName)

    return (

        <main className='fixed h-12 w-4/5 top-2 left-1/2 -translate-x-1/2 flex justify-between items-center bg-black/30 backdrop-blur-xs border rounded-3xl '>
            <div className='font-bold ml-8'> 
                LOGO
            </div>
            {userId && (
                <div className='flex '>
                    <div className='group w-20 text-center text-gray-300 hover:text-gray-100 hover:cursor-default'> Markets</div>
                    <div className='group w-20 text-center text-gray-300 hover:text-gray-100 hover:cursor-default'> Trade</div>
                    <div className='group w-20 text-center text-gray-300 hover:text-gray-100 hover:cursor-default'> Position</div>
                    <div className='group w-20 text-center text-gray-300 hover:text-gray-100 hover:cursor-default'> Account</div>
                </div>

            )}
            {userId ?
                (
                    <div className='flex gap-1  mr-2'>
                        <Link href="/ramp">
                            <div className='border border-gray-300 rounded-2xl px-2 py-1 w-25 text-center bg-black/50'>Deposit</div>
                        </Link>
                        <Link href="/ramp">
                            <div className='border border-gray-300 rounded-2xl px-2 py-1 w-25 text-center bg-black/50'>Withdraw</div>
                        </Link>
                    </div>

                )
                :
                (
                    <Link href="/auth">Login</Link>
                )
            }
        </main>
    )
}

export default Appbar