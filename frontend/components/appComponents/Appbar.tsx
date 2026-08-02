"use client";
import React from 'react'
import { Button } from '../ui/button'
import { useAppStore } from '@/store/store'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, CandlestickChart, Plus } from 'lucide-react'
import AvatarMenu from './AvatarMenu'

const NAV_LINKS = [
    { href: "/market", label: "Markets", match: (path: string) => path === "/market" || path === "/" },
    { href: "/trade/BTCUSD", label: "Trade", match: (path: string) => path.startsWith("/trade") },
    { href: "/position", label: "Position", match: (path: string) => path.startsWith("/position") },
    { href: "/account", label: "Account", match: (path: string) => path.startsWith("/account") },
];

const Appbar = () => {
    const userId = useAppStore((state) => state.userId)
    const pathname = usePathname()

    return (
        <main className='fixed top-0 z-50 flex h-12 w-full items-center gap-6 border-b border-zinc-900 bg-black/30 px-4 backdrop-blur-xs'>
            {/* BRAND */}
            <Link href="/market" className='flex shrink-0 items-center gap-2'>
                <span className='flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-ind to-ind-dark text-white'>
                    <CandlestickChart className='h-4 w-4' />
                </span>
                <span className='text-base font-bold tracking-tight text-gray-100'>TradeX</span>
            </Link>

            {/* NAV */}
            {userId && (
                <nav className='flex h-full items-center gap-1'>
                    {NAV_LINKS.map((link) => {
                        const active = link.match(pathname)
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`relative flex h-full items-center px-3 text-sm transition-colors ${active ? "text-gray-50" : "text-gray-400 hover:text-gray-100"}`}
                            >
                                {link.label}
                                {active && (
                                    <span className='absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-ind' />
                                )}
                            </Link>
                        )
                    })}
                </nav>
            )}

            {/* ACTIONS */}
            {userId ? (
                <div className='ml-auto flex items-center gap-3'>
                    <Button asChild size="sm" className='bg-ind text-white hover:bg-ind-dark'>
                        <Link href="/ramp">
                            <Plus data-slot="icon" />
                            Deposit
                        </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className='text-gray-300 hover:border-zinc-600'>
                        <Link href="/ramp">
                            Withdraw
                            <ArrowUpRight data-slot="icon" />
                        </Link>
                    </Button>

                    {/* AVATAR DROPDOWN */}
                    <AvatarMenu />
                </div>
            ) : (
                <div className='ml-auto flex items-center gap-3'>
                    <Button asChild size="sm" variant="outline" className='text-gray-300'>
                        <Link href="/auth?mode=signin">Login</Link>
                    </Button>
                    <Button asChild size="sm" className='bg-ind text-white hover:bg-ind-dark'>
                        <Link href="/auth?mode=signup">Sign up</Link>
                    </Button>
                </div>
            )}
        </main>
    )
}

export default Appbar
