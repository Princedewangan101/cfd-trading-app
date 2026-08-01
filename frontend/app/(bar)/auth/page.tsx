"use client";
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react'
import { Suspense } from 'react'

const AuthPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { mutate, isPending } = useAuth();
    const authPage: "signin" | "signup" = searchParams.get("mode") === "signin" ? "signin" : "signup";

    function changeAuthPage() {
        const nextMode = authPage === "signup" ? "signin" : "signup";
        router.push(`/auth?mode=${nextMode}`);
    }

    function handleAuthenthication(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        mutate({ formData, mode: authPage });
    }

    return (
        <main className='w-screen h-screen flex items-center justify-center'>

            <div className="boxShadow flex flex-col justify-center w-full max-w-80 rounded-xl px-6 py-8 border bg-zinc border-border text-white text-sm">
                <h2 className="text-2xl font-semibold">{authPage === "signup" ? "Sign Up" : "Log in"}</h2>
                <form onSubmit={handleAuthenthication} className="mt-8">
                    {authPage === "signup" &&
                        <>
                            <label htmlFor="userName" className="block mb-1 font-medium text-slate-300">User name</label>
                            <input required type="text" id="userName" name="userName" placeholder="Alibaba" className="w-full p-2 mb-3 bg-zinc-900/70 rounded-md focus:outline-none" />

                        </>
                    }

                    <label htmlFor="email" className="block mb-1 font-medium text-slate-300">Email address</label>
                    <input required type="email" id="email" name="email" placeholder="alibaba@gmail.com" className="w-full p-2 mb-3 bg-zinc-900/70 rounded-md focus:outline-none" />

                    <label htmlFor="password" className="block mb-1 font-medium text-slate-300">Password</label>
                    <input required type="password" id="password" name="password" placeholder="911" className="w-full p-2 mb-3 bg-secondary rounded-md focus:outline-none" />
                    {authPage === "signin" &&
                        <>
                            <div className="text-right text-xs">
                                <Link href="#" className="font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</Link>
                            </div>
                        </>
                    }

                    <button type="submit" disabled={isPending} className="w-full mt-6 mb-4 px-4 py-2.5 font-medium text-white bg-ind rounded-md hover:bg-ind-dark focus:outline-none disabled:opacity-70">
                        {isPending ? (
                            <span className="flex items-center justify-center gap-1.5">
                                <span className="animate-dotPulse h-2 w-2 rounded-full bg-white" />
                                <span className="animate-dotPulse h-2 w-2 rounded-full bg-white" style={{ animationDelay: "150ms" }} />
                                <span className="animate-dotPulse h-2 w-2 rounded-full bg-white" style={{ animationDelay: "300ms" }} />
                            </span>
                        ) : (
                            authPage === "signup" ? "Sign Up" : "Log in"
                        )}
                    </button>

                    <p className='text-xs'>{authPage === "signup" ? "Already have an account ? " : "Want to create new ? "}
                        <span className='cursor-pointer' onClick={changeAuthPage}>{authPage === "signup" ? "Log in" : "Sign Up"} </span>
                    </p>
                </form>
            </div>
        </main>
    )
}

export default function AuthPageWrapper() {
    return (
        <Suspense>
            <AuthPage />
        </Suspense>
    )
}
