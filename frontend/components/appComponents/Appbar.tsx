"use client";
import React from 'react'
import { Button } from '../ui/button'
import { useAppStore } from '@/store/store'
import Link from 'next/link'

const Appbar = () => {
    const userId = useAppStore((state) => state.userId)
    const userName = useAppStore((state) => state.userName)

    return (

        <main className='border-2 border-red-300 h-15 '>
            {userId && `USER-ID : ${userId} , USER-NAME : ${userName}`} <br />
            
            {userId ? <Link href="/deposit">DEPOSIT</Link>  : <Link href="/auth">Login</Link>}
        </main>
    )
}

export default Appbar