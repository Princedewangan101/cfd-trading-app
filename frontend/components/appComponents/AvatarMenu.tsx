"use client";

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CandlestickChart, ChevronDown, Copy, ImagePlus, LogOut, ReceiptText, Settings, TrendingUp, User } from 'lucide-react'
import { useAppStore } from '@/store/store'
import { toastSuccess } from '@/lib/toast'
import { config } from '@/lib/config'
import axios from 'axios'

const USER_MENU = [
    { href: "/settings", label: "Settings", Icon: Settings },
    { href: "/account", label: "Account", Icon: User },
    { href: "/transactions", label: "Transactions", Icon: ReceiptText },
];

const EXTRA_LINKS = [
    { href: "/market", label: "Market", Icon: CandlestickChart },
    { href: "/trade/BTCUSD", label: "Trade", Icon: TrendingUp },
];

const getProfilePicKey = (userId: string) => `profilePic:${userId}`;

const readProfilePic = (userId: string): string | null => {
    if (typeof window === "undefined" || !userId) return null;
    try {
        return window.localStorage.getItem(getProfilePicKey(userId));
    } catch {
        return null;
    }
};

const AvatarMenu = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const userId = useAppStore((state) => state.userId)
    const userName = useAppStore((state) => state.userName)
    const router = useRouter()
    const menuRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [, setPicNonce] = useState(0)

    const avatarClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";

    const profilePic = readProfilePic(userId);

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

    async function handleLogout() {
        setMenuOpen(false)
        try {
            await axios.post("http://localhost:5000/api/logout", {}, config)
        } catch {
            // clear local state even if the server call fails
        }
        useAppStore.setState({ userId: "", userName: "" })
        router.push("/auth")
    }

    function handleCopyId() {
        navigator.clipboard.writeText(userId).then(() => {
            toastSuccess("ID copied");
        }).catch(() => {
            // fallback
        });
    }

    function handlePicSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            window.localStorage.setItem(getProfilePicKey(userId), base64);
            setPicNonce((n) => n + 1);
            setMenuOpen(false);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    }

    const displayId = userId.length > 13 ? `${userId.slice(0, 13)}....` : userId;

    return (
        <div ref={menuRef} className='relative'>
            <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className='flex items-center gap-0.5 rounded-full p-1 transition-colors hover:bg-zinc-800/60 focus:outline-none'
            >
                {profilePic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profilePic} alt="avatar" className={`${avatarClass} rounded-full object-cover`} />
                ) : (
                    <span className={`flex ${avatarClass} items-center justify-center rounded-full bg-gradient-to-br from-ind to-ind-dark font-bold text-white`}>
                        {(userName || "U").charAt(0).toUpperCase()}
                    </span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
                <div className='absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-md'>
                    <div className='border-b border-zinc-800 px-3 py-2.5'>
                        <p className='truncate text-sm font-semibold text-gray-100'>{userName}</p>
                        <div className='flex items-center gap-1'>
                            <p className='truncate text-xs text-gray-500'>{displayId}</p>
                            <button
                                type="button"
                                onClick={handleCopyId}
                                aria-label="Copy user id"
                                className='shrink-0 p-0.5 text-gray-500 transition-colors hover:text-gray-200'
                            >
                                <Copy className='h-3 w-3' />
                            </button>
                        </div>
                    </div>
                    <div className='p-1'>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className='flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-300 transition-colors hover:bg-zinc-800 hover:text-gray-100'
                        >
                            <ImagePlus className='h-4 w-4 text-gray-500' />
                            Add pic
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePicSelect}
                        />
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
                        <div className='my-1 border-t border-zinc-800' />
                        {EXTRA_LINKS.map(({ href, label, Icon }) => (
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
    )
}

export default AvatarMenu
