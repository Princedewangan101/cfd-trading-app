"use client";
import React, { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { useAppStore } from '@/store/store'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowUpRight, CandlestickChart, ChevronDown, LogOut, Plus, ReceiptText, Settings, User } from 'lucide-react'

const NAV_LINKS = [
    { href: "/market", label: "Markets", match: (path: string) => path === "/market" || path === "/" },
    { href: "/trade/BTCUSD", label: "Trade", match: (path: string) => path.startsWith("/trade") },
    { href: "/position", label: "Position", match: (path: string) => path.startsWith("/position") },
    { href: "/account", label: "Account", match: (path: string) => path.startsWith("/account") },
];

const USER_MENU = [
    { href: "/settings", label: "Settings", Icon: Settings },
    { href: "/account", label: "Account", Icon: User },
    { href: "/transactions", label: "Transactions", Icon: ReceiptText },
];

const Appbar = () => {
    const userId = useAppStore((state) => state.userId)
    const userName = useAppStore((state) => state.userName)
    const pathname = usePathname()
    const router = useRouter()
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuOpen, setMenuOpen] = useState(false)

    function handleLogout() {
        setMenuOpen(false)
        useAppStore.setState({ userId: "", userName: "" })
        router.push("/auth")
    }

    useEffect(() => {
        if (!menuOpen) return
        const handleClick = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false)
            }
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuOpen(false)
        }
        document.addEventListener("mousedown", handleClick)
        document.addEventListener("keydown", handleKey)
        return () => {
            document.removeEventListener("mousedown", handleClick)
            document.removeEventListener("keydown", handleKey)
        }
    }, [menuOpen])

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
                    <div ref={menuRef} className='relative'>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((prev) => !prev)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            className='flex items-center gap-0.5 rounded-full p-1 transition-colors hover:bg-zinc-800/60 focus:outline-none'
                        >
                            <span className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ind to-ind-dark text-xs font-bold text-white'>
                                {(userName || "U").charAt(0).toUpperCase()}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                        </button>

                        {menuOpen && (
                            <div className='absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-md'>
                                <div className='border-b border-zinc-800 px-3 py-2.5'>
                                    <p className='truncate text-sm font-semibold text-gray-100'>{userName}</p>
                                    <p className='truncate text-xs text-gray-500'>{userId}</p>
                                </div>
                                <div className='p-1'>
                                    {USER_MENU.map(({ href, label, Icon }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={() => setMenuOpen(false)}
                                            className='flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-300 transition-colors hover:bg-zinc-800 hover:text-gray-100'
                                        >
                                            <Icon className='h-4 w-4 text-gray-500' />
                                            {label}
                                        </Link>
                                    ))}
                                </div>
                                <div className='border-t border-zinc-800 p-1'>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className='flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-300 transition-colors hover:bg-red-500/10 hover:text-red-400'
                                    >
                                        <LogOut className='h-4 w-4 text-gray-500' />
                                        Log out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
